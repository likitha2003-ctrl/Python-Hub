# Contributing

Thank you for your interest in contributing!

## Getting started

```bash
git clone https://github.com/<your-username>/iot-telemetry-normalizer.git
cd iot-telemetry-normalizer
python3 --version   # requires 3.8+
```

No dependencies to install — the project uses only the Python standard library.

## Running the project

```bash
# Interactive launcher
python3 run.py

# Pipeline only
python3 main.py

# Custom input/output paths
python3 main.py --input data/input/sample_telemetry.json --output data/output/result.json

# Full test suite
python3 -m unittest tests/test_normalizer.py -v
```

## Project layout

```
src/normalizer.py      — core logic (unit conversion, field extraction, I/O)
src/logger_config.py   — shared logger factory
main.py                — CLI entry point
run.py                 — interactive launcher menu
tests/test_normalizer.py — 24 unit tests
data/input/            — raw telemetry JSON samples
data/output/           — generated output (git-ignored)
```

## Adding a new unit conversion

1. Add a helper function in `src/normalizer.py` (follow the `fahrenheit_to_celsius` pattern).
2. Wire it into `normalize_record()`.
3. Add corresponding tests in `tests/test_normalizer.py`.
4. Update the README example input/output section.

## Code style

- PEP 8 compliant; line length ≤ 100 characters.
- Every public function must have a Google-style docstring.
- No third-party dependencies — standard library only.
