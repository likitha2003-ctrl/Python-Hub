import { Router } from "express";
import { exec } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { RunCommandBody } from "@workspace/api-zod";

const router = Router();

// Absolute path to the Python project.
// WORKSPACE_DIR is always /home/runner/workspace in the Replit environment.
const WORKSPACE_DIR = process.env.REPL_HOME ?? "/home/runner/workspace";
const PROJECT_ROOT = path.join(WORKSPACE_DIR, "iot-telemetry-normalizer");

// Files/dirs to exclude from the tree (noise reduction)
const EXCLUDED = new Set([
  "__pycache__",
  ".git",
  "node_modules",
  ".pytest_cache",
  ".mypy_cache",
  ".ruff_cache",
]);

// Map file extensions to language identifiers for syntax highlighting hints
const LANG_MAP: Record<string, string> = {
  ".py": "python",
  ".json": "json",
  ".md": "markdown",
  ".txt": "text",
  ".toml": "toml",
  ".yml": "yaml",
  ".yaml": "yaml",
  ".sh": "bash",
  "": "text",
};

interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
}

function buildTree(dirPath: string, relBase: string = ""): FileNode {
  const name = path.basename(dirPath);
  const rel = relBase ? relBase : "";

  const stat = fs.statSync(dirPath);
  if (!stat.isDirectory()) {
    return { name, path: rel || name, type: "file" };
  }

  const entries = fs
    .readdirSync(dirPath)
    .filter((e) => !EXCLUDED.has(e) && !e.startsWith(".") || e === ".gitignore")
    .sort((a, b) => {
      // Directories first, then files, then alphabetical within each group
      const aIsDir = fs.statSync(path.join(dirPath, a)).isDirectory();
      const bIsDir = fs.statSync(path.join(dirPath, b)).isDirectory();
      if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
      return a.localeCompare(b);
    });

  const children: FileNode[] = entries.map((entry) => {
    const childAbs = path.join(dirPath, entry);
    const childRel = relBase ? `${relBase}/${entry}` : entry;
    return buildTree(childAbs, childRel);
  });

  return { name, path: rel || name, type: "dir", children };
}

// GET /api/project/tree
router.get("/tree", (req, res) => {
  try {
    const tree = buildTree(PROJECT_ROOT, "");
    res.json({ root: tree, projectName: "iot-telemetry-normalizer" });
  } catch (err) {
    req.log.error({ err }, "Failed to build file tree");
    res.status(500).json({ error: "Could not read project directory" });
  }
});

// GET /api/project/file?path=src/normalizer.py
router.get("/file", (req, res) => {
  const relPath = req.query.path as string | undefined;

  if (!relPath) {
    res.status(400).json({ error: "Missing required query param: path" });
    return;
  }

  // Security: resolve and confirm the target is inside PROJECT_ROOT
  const target = path.resolve(PROJECT_ROOT, relPath);
  if (!target.startsWith(PROJECT_ROOT + path.sep) && target !== PROJECT_ROOT) {
    res.status(400).json({ error: "Path traversal not allowed" });
    return;
  }

  if (!fs.existsSync(target)) {
    res.status(404).json({ error: `File not found: ${relPath}` });
    return;
  }

  if (fs.statSync(target).isDirectory()) {
    res.status(400).json({ error: "Path is a directory, not a file" });
    return;
  }

  try {
    const content = fs.readFileSync(target, "utf-8");
    const ext = path.extname(target);
    const language = LANG_MAP[ext] ?? "text";
    res.json({ path: relPath, content, language });
  } catch (err) {
    req.log.error({ err }, "Failed to read file: %s", relPath);
    res.status(500).json({ error: "Could not read file" });
  }
});

// POST /api/project/run  { command: "pipeline" | "tests" | "both" }
router.post("/run", (req, res) => {
  const parsed = RunCommandBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "command must be 'pipeline', 'tests', or 'both'" });
    return;
  }

  const { command } = parsed.data;

  const CMD_MAP: Record<string, string> = {
    pipeline: "python3 main.py",
    tests: "python3 -m unittest tests/test_normalizer.py -v",
    both: "python3 main.py && echo '---' && python3 -m unittest tests/test_normalizer.py -v",
  };

  const cmd = CMD_MAP[command];

  exec(cmd, { cwd: PROJECT_ROOT, timeout: 30000 }, (error, stdout, stderr) => {
    res.json({
      stdout: stdout ?? "",
      stderr: stderr ?? "",
      exitCode: error?.code ?? 0,
    });
  });
});

export default router;
