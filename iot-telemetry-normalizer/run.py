"""
run.py
------
Interactive launcher for the IoT Telemetry Data Normalizer.

Run this file to get a menu-driven interface:
    python3 run.py

You can also run individual commands directly:
    python3 main.py
    python3 -m unittest tests/test_normalizer.py -v
"""

import subprocess
import sys
import os

BOLD  = "\033[1m"
GREEN = "\033[92m"
CYAN  = "\033[96m"
YELLOW = "\033[93m"
RED   = "\033[91m"
RESET = "\033[0m"

BANNER = f"""
{CYAN}{BOLD}╔══════════════════════════════════════════════╗
║   IoT Telemetry Data Normalizer             ║
║   Deloitte Forage · Python 3 · MIT License  ║
╚══════════════════════════════════════════════╝{RESET}

Python {sys.version.split()[0]}  |  Working dir: {os.getcwd()}
"""

MENU = f"""
{BOLD}What would you like to do?{RESET}

  {GREEN}[1]{RESET}  Run the normalizer pipeline     {YELLOW}python3 main.py{RESET}
  {GREEN}[2]{RESET}  Run all unit tests              {YELLOW}python3 -m unittest tests/test_normalizer.py -v{RESET}
  {GREEN}[3]{RESET}  Run pipeline + tests            (both, in order)
  {GREEN}[4]{RESET}  Open interactive Python shell   {YELLOW}python3 -i main.py{RESET}
  {GREEN}[q]{RESET}  Quit

"""


def run(cmd: list[str]) -> int:
    """Run a shell command, streaming output live."""
    print(f"\n{CYAN}$ {' '.join(cmd)}{RESET}\n{'─' * 50}")
    result = subprocess.run(cmd)
    print('─' * 50)
    return result.returncode


def main() -> None:
    # Change into the project directory so relative paths work
    project_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(project_dir)

    print(BANNER)

    while True:
        print(MENU, end="")
        try:
            choice = input("  Enter choice: ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            print(f"\n{YELLOW}Bye!{RESET}\n")
            break

        if choice == "1":
            run([sys.executable, "main.py"])

        elif choice == "2":
            run([sys.executable, "-m", "unittest", "tests/test_normalizer.py", "-v"])

        elif choice == "3":
            rc = run([sys.executable, "main.py"])
            if rc == 0:
                run([sys.executable, "-m", "unittest", "tests/test_normalizer.py", "-v"])
            else:
                print(f"\n{RED}Pipeline failed (exit {rc}) — skipping tests.{RESET}")

        elif choice == "4":
            print(f"\n{YELLOW}Opening interactive shell... (type exit() or Ctrl-D to return){RESET}")
            os.execv(sys.executable, [sys.executable, "-i", "main.py"])

        elif choice in ("q", "quit", "exit"):
            print(f"\n{YELLOW}Bye!{RESET}\n")
            break

        else:
            print(f"\n{RED}Unknown option '{choice}' — try 1, 2, 3, 4, or q.{RESET}\n")


if __name__ == "__main__":
    main()
