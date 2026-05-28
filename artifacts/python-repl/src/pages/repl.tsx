import { useState, useRef, useEffect } from "react";
import { useExecuteCode } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Play, Loader2, Terminal, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_CODE = `# Welcome to the Python REPL
def greet(name):
    print(f"Hello, {name}!")

greet("Developer")
`;

export default function REPL() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const executeMutation = useExecuteCode();

  const handleRun = () => {
    if (!code.trim() || executeMutation.isPending) return;
    executeMutation.mutate({ data: { code } });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleRun();
    }
  };

  const { data: result, isPending, isError } = executeMutation;

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex-none h-14 border-b border-border flex items-center justify-between px-4 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Terminal className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground tracking-tight">Python Scratchpad</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono hidden sm:inline-block">
            Cmd + Enter to run
          </span>
          <Button 
            onClick={handleRun} 
            disabled={isPending || !code.trim()}
            className="gap-2 font-medium"
            data-testid="button-run-code"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            Run
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0">
        {/* Editor Area */}
        <div className="flex-1 relative group bg-[#0d1117]">
          {/* Line numbers mock (visual only for aesthetic) */}
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-black/20 border-r border-border/50 text-right pr-2 pt-4 font-mono text-sm text-muted-foreground/30 select-none pointer-events-none">
            {code.split('\n').map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            className="w-full h-full p-4 pl-16 font-mono text-[15px] leading-relaxed bg-transparent text-[#e6edf3] resize-none outline-none focus:ring-0 focus-visible:ring-0 selection:bg-primary/30"
            placeholder="Write Python code here..."
            data-testid="input-code-editor"
          />
        </div>

        {/* Output Panel */}
        <div className="h-1/3 min-h-[200px] border-t border-border flex flex-col bg-[#010409]">
          <div className="flex-none h-9 border-b border-border/50 px-4 flex items-center justify-between bg-black/20">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Output</span>
            {result && result.exitCode !== 0 && (
              <span className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-md border border-destructive/20" data-testid="status-exit-code">
                <AlertCircle className="w-3.5 h-3.5" />
                Exit code: {result.exitCode}
              </span>
            )}
            {result && result.exitCode === 0 && (
              <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20" data-testid="status-exit-code">
                Success
              </span>
            )}
          </div>
          <div className="flex-1 p-4 overflow-auto font-mono text-[14px] leading-relaxed">
            {isPending ? (
              <div className="flex items-center gap-2 text-muted-foreground" data-testid="status-running">
                <Loader2 className="w-4 h-4 animate-spin" />
                Executing...
              </div>
            ) : result ? (
              <div className="flex flex-col gap-2">
                {result.stdout && (
                  <pre className="whitespace-pre-wrap break-words text-foreground" data-testid="text-stdout">
                    {result.stdout}
                  </pre>
                )}
                {result.stderr && (
                  <pre className="whitespace-pre-wrap break-words text-destructive" data-testid="text-stderr">
                    {result.stderr}
                  </pre>
                )}
                {!result.stdout && !result.stderr && (
                  <span className="text-muted-foreground italic" data-testid="text-empty-output">No output</span>
                )}
              </div>
            ) : isError ? (
              <div className="text-destructive flex items-center gap-2" data-testid="status-error">
                <AlertCircle className="w-4 h-4" />
                Failed to execute code. Server error.
              </div>
            ) : (
              <div className="text-muted-foreground/50 italic select-none" data-testid="text-waiting">
                Run your code to see the output here.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
