import { useState } from "react";
import {
  useGetProjectTree,
  useGetFileContent,
  useRunCommand,
} from "@workspace/api-client-react";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  FolderOpen,
  Play,
  FlaskConical,
  Loader2,
  Terminal,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Language → colour classes ─────────────────────────────────────────────

const LANG_COLOURS: Record<string, string> = {
  ".py": "text-sky-300",
  ".json": "text-amber-300",
  ".md": "text-purple-300",
  ".toml": "text-pink-300",
  ".yml": "text-green-300",
  ".yaml": "text-green-300",
  ".txt": "text-zinc-400",
  ".gitignore": "text-zinc-500",
};

function extOf(name: string) {
  if (name === ".gitignore") return ".gitignore";
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot) : "";
}

// ─── File-tree node ─────────────────────────────────────────────────────────

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: TreeNode[];
}

function FileNode({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth === 0);

  if (node.type === "dir") {
    return (
      <div>
        <button
          className="w-full flex items-center gap-1 px-2 py-[3px] rounded hover:bg-white/5 text-zinc-300 text-sm select-none"
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="text-zinc-500 w-3.5 flex-none">
            {open ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
          <span className="text-blue-400 flex-none">
            {open ? (
              <FolderOpen className="w-3.5 h-3.5" />
            ) : (
              <Folder className="w-3.5 h-3.5" />
            )}
          </span>
          <span className="truncate">{node.name}</span>
        </button>
        {open &&
          node.children?.map((child) => (
            <FileNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
      </div>
    );
  }

  const ext = extOf(node.name);
  const colourClass = LANG_COLOURS[ext] ?? "text-zinc-300";
  const isSelected = node.path === selectedPath;

  return (
    <button
      className={cn(
        "w-full flex items-center gap-1.5 px-2 py-[3px] rounded text-sm select-none truncate",
        isSelected
          ? "bg-sky-500/20 text-white"
          : "hover:bg-white/5 text-zinc-300"
      )}
      style={{ paddingLeft: `${8 + depth * 14}px` }}
      onClick={() => onSelect(node.path)}
    >
      <FileText className={cn("w-3.5 h-3.5 flex-none", colourClass)} />
      <span className={cn("truncate", colourClass)}>{node.name}</span>
    </button>
  );
}

// ─── Terminal output panel ───────────────────────────────────────────────────

function Output({
  stdout,
  stderr,
  exitCode,
  pending,
  empty,
}: {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  pending: boolean;
  empty: boolean;
}) {
  if (pending) {
    return (
      <div className="flex items-center gap-2 text-zinc-400 p-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Running…
      </div>
    );
  }
  if (empty) {
    return (
      <p className="p-4 text-zinc-600 italic text-sm select-none">
        Click <strong className="text-zinc-400 not-italic">▶ Run Pipeline</strong> or{" "}
        <strong className="text-zinc-400 not-italic">Run Tests</strong> to see output.
      </p>
    );
  }
  return (
    <div className="p-4 space-y-1 overflow-auto h-full">
      {stdout && (
        <pre className="whitespace-pre-wrap break-words text-zinc-100 text-[13px] leading-relaxed font-mono">
          {stdout}
        </pre>
      )}
      {stderr && (
        <pre
          className={cn(
            "whitespace-pre-wrap break-words text-[13px] leading-relaxed font-mono",
            exitCode === 0 ? "text-emerald-400" : "text-red-400"
          )}
        >
          {stderr}
        </pre>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function IDE() {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [lastCommand, setLastCommand] = useState<string | null>(null);

  const { data: treeData, isLoading: treeLoading } = useGetProjectTree();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: fileData, isFetching: fileFetching } = useGetFileContent(
    { path: selectedPath ?? "" },
    { query: { enabled: !!selectedPath } as any }
  );
  const runMutation = useRunCommand();

  const runTree = treeData?.root;

  const handleRun = (command: "pipeline" | "tests") => {
    setLastCommand(command);
    runMutation.mutate({ data: { command } });
  };

  const result = runMutation.data;
  const pending = runMutation.isPending;
  const hasResult = !!result;
  const exitCode = result ? result.exitCode : null;

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0d1117] text-foreground overflow-hidden font-mono text-sm">
      {/* ── Header ── */}
      <header className="flex-none h-11 border-b border-white/10 flex items-center justify-between px-4 bg-[#161b22]">
        <div className="flex items-center gap-2 text-zinc-200">
          <Terminal className="w-4 h-4 text-sky-400 flex-none" />
          <span className="font-semibold tracking-tight">iot-telemetry-normalizer</span>
          <span className="text-zinc-600 text-xs hidden sm:inline">· Python 3.12</span>
        </div>
        <div className="flex items-center gap-2">
          {hasResult && !pending && (
            <span
              className={cn(
                "flex items-center gap-1 text-xs px-2 py-0.5 rounded border",
                exitCode === 0
                  ? "text-emerald-400 bg-emerald-950/50 border-emerald-800"
                  : "text-red-400 bg-red-950/50 border-red-800"
              )}
            >
              {exitCode === 0 ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <XCircle className="w-3 h-3" />
              )}
              {exitCode === 0 ? "Passed" : `Exit ${exitCode}`}
            </span>
          )}
          <button
            onClick={() => handleRun("pipeline")}
            disabled={pending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-sans font-medium transition-colors"
          >
            {pending && lastCommand === "pipeline" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            Run Pipeline
          </button>
          <button
            onClick={() => handleRun("tests")}
            disabled={pending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white text-xs font-sans font-medium transition-colors"
          >
            {pending && lastCommand === "tests" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FlaskConical className="w-3.5 h-3.5" />
            )}
            Run Tests
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">
        {/* ── Sidebar: file tree ── */}
        <aside className="flex-none w-56 border-r border-white/10 flex flex-col bg-[#0d1117] overflow-hidden">
          <div className="flex-none px-3 py-2 border-b border-white/10 text-[11px] uppercase tracking-widest text-zinc-500 font-sans">
            Explorer
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {treeLoading ? (
              <div className="flex items-center gap-2 px-4 py-3 text-zinc-500 text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
              </div>
            ) : runTree ? (
              // Skip the root node and render its children directly
              runTree.children?.map((child) => (
                <FileNode
                  key={child.path}
                  node={child}
                  depth={0}
                  selectedPath={selectedPath}
                  onSelect={setSelectedPath}
                />
              ))
            ) : (
              <p className="px-4 py-3 text-zinc-600 text-xs">Could not load files</p>
            )}
          </div>
        </aside>

        {/* ── Right panel: editor + terminal ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* File viewer */}
          <div className="flex-1 overflow-auto bg-[#0d1117] relative">
            {!selectedPath ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 select-none gap-2">
                <FileText className="w-8 h-8 opacity-40" />
                <p className="text-sm font-sans">Select a file to view its contents</p>
              </div>
            ) : fileFetching ? (
              <div className="flex items-center gap-2 px-6 py-4 text-zinc-500 text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
              </div>
            ) : fileData ? (
              <div className="h-full flex flex-col">
                {/* file breadcrumb */}
                <div className="flex-none px-4 py-1.5 border-b border-white/10 bg-[#161b22] text-[11px] text-zinc-400 font-sans tracking-wide">
                  {fileData.path}
                </div>
                {/* content with line numbers */}
                <div className="flex-1 overflow-auto flex">
                  <div
                    className="flex-none select-none text-right pr-4 pt-4 text-zinc-700 text-[13px] leading-relaxed bg-[#0d1117] border-r border-white/5"
                    style={{ minWidth: "3.5rem" }}
                  >
                    {fileData.content.split("\n").map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  <pre className="flex-1 pt-4 px-4 text-[13px] leading-relaxed text-zinc-100 whitespace-pre overflow-x-auto">
                    {fileData.content}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="px-6 py-4 text-zinc-600 text-xs font-sans">
                Failed to load file.
              </p>
            )}
          </div>

          {/* Terminal output */}
          <div
            className="flex-none border-t border-white/10 bg-[#010409] flex flex-col overflow-hidden"
            style={{ height: "38%" }}
          >
            <div className="flex-none h-8 border-b border-white/10 bg-[#0d1117] flex items-center gap-2 px-4">
              <Terminal className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-sans">
                Terminal
              </span>
              {lastCommand && !pending && (
                <span className="text-[11px] text-zinc-600 font-sans">
                  — {lastCommand === "pipeline" ? "python3 main.py" : "python3 -m unittest tests/test_normalizer.py -v"}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-auto">
              <Output
                stdout={result?.stdout ?? ""}
                stderr={result?.stderr ?? ""}
                exitCode={exitCode}
                pending={pending}
                empty={!hasResult && !pending}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
