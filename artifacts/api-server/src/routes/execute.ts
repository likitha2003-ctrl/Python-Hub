import { Router } from "express";
import { exec } from "child_process";
import { ExecuteCodeBody } from "@workspace/api-zod";

const router = Router();

router.post("/", (req, res) => {
  const parsed = ExecuteCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { code } = parsed.data;

  exec(
    `python3 -c ${JSON.stringify(code)}`,
    { timeout: 10000 },
    (error, stdout, stderr) => {
      res.json({
        stdout: stdout ?? "",
        stderr: stderr ?? "",
        exitCode: error?.code ?? 0,
      });
    },
  );
});

export default router;
