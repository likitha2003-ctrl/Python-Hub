import { useState, useRef, useEffect } from "react";
import { useExecuteCode } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Play, Loader2, Terminal, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_CODE = `# IoT Telemetry Data Normalizer — Demo
# Converts raw device readings into a clean, consistent schema.

import json
from datetime import datetime, timezone

def fahrenheit_to_celsius(temp_f):
    """Convert Fahrenheit to Celsius, rounded to 2 decimal places."""
    return round((temp_f - 32) * 5 / 9, 2)

def unix_to_iso8601(timestamp):
    """Convert a Unix epoch (int) to an ISO 8601 UTC string."""
    dt = datetime.fromtimestamp(timestamp, tz=timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def normalize_record(record):
    """Normalize a single raw telemetry record."""
    device_id = record.get("device_id")
    if not device_id or "ts" not in record:
        print(f"  [SKIP] Missing required field in: {record}")
        return None

    # Resolve temperature — handles both Fahrenheit and Celsius fields
    if "temp_f" in record and record["temp_f"] is not None:
        temp_c = fahrenheit_to_celsius(record["temp_f"])
        print(f"  [CONV] {device_id}: {record['temp_f']}°F → {temp_c}°C")
    elif "temperature" in record:
        temp_c = round(float(record["temperature"]), 2)
        print(f"  [PASS] {device_id}: {temp_c}°C (already Celsius)")
    else:
        temp_c = None
        print(f"  [WARN] {device_id}: no temperature field found")

    humidity = record.get("humidity_pct") or record.get("humidity")

    return {
        "device_id": device_id,
        "timestamp_utc": unix_to_iso8601(record["ts"]),
        "temperature_celsius": temp_c,
        "humidity_percent": round(float(humidity), 2) if humidity is not None else None,
        "battery_millivolts": record.get("battery_mv"),
        "status": record.get("status"),
        "normalized": True,
    }

# --- Sample raw payload (mixed field names and units) ---
raw_data = [
    {"device_id": "sensor-001", "ts": 1700000000, "temp_f": 98.6,  "humidity_pct": 65.3, "battery_mv": 3700, "status": "active"},
    {"device_id": "sensor-002", "ts": 1700000060, "temperature": 22.0, "humidity": 71.5, "battery_mv": 3550, "status": "active"},
    {"device_id": "sensor-003", "ts": 1700000120, "temp_f": 32.0,  "humidity_pct": 90.0, "battery_mv": 2900, "status": "low_battery"},
    {"device_id": "sensor-004", "ts": 1700000180, "temp_f": None,  "humidity_pct": 55.0, "battery_mv": 3800, "status": "active"},
]

print("IoT Telemetry Data Normalizer")
print("=" * 40)

results = [r for record in raw_data if (r := normalize_record(record)) is not None]

print()
print(f"Normalized {len(results)} of {len(raw_data)} record(s):")
print(json.dumps(results, indent=2))
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
