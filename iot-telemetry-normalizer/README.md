# IoT Telemetry Data Normalizer

> A lightweight Python pipeline that ingests raw IoT device telemetry, normalises heterogeneous field names and units into a consistent schema, and outputs clean JSON — built as part of the [Deloitte Technology Virtual Experience](https://www.theforage.com/virtual-internships/prototype/WhoseSS3MmzmtRmgv/Deloitte-STEM) on Forage.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Project Structure](#project-structure)
- [Example Input / Output](#example-input--output)
- [How to Run Locally](#how-to-run-locally)
- [Running the Tests](#running-the-tests)
- [Screenshots](#screenshots)
- [Future Improvements](#future-improvements)
- [Resume Description](#resume-description)
- [License](#license)

---

## Overview

Real-world IoT deployments send telemetry from hundreds of device models — each with its own field naming conventions and unit systems. This project solves that problem with a clean, beginner-friendly Python pipeline that:

1. **Loads** a raw JSON payload from any IoT device fleet.
2. **Normalises** field names, converts units (e.g. °F → °C), and validates required fields.
3. **Outputs** a consistent JSON schema ready for a database, API, or analytics dashboard.

The pipeline is written with readability first — clear function names, full docstrings, structured logging, and a unittest suite — making it a strong portfolio piece for software engineering roles.

---

## Features

| Feature | Details |
|---|---|
| **Unit conversion** | Fahrenheit → Celsius with rounding to 2 d.p. |
| **Field aliasing** | Handles `temp_f` / `temperature`, `humidity_pct` / `humidity` |
| **Timestamp conversion** | Unix epoch → ISO 8601 UTC (`2023-11-14T22:13:20Z`) |
| **Null-safe handling** | Null or missing optional fields produce `null` in output, not a crash |
| **Record validation** | Records missing `device_id` or `ts` are skipped and logged |
| **Structured logging** | Timestamped, levelled logs for every conversion step |
| **CLI support** | Custom input/output paths via `--input` / `--output` flags |
| **Unit tests** | 20 tests covering conversions, extraction, validation, and edge cases |
| **Zero dependencies** | Standard library only — no `pip install` required |

---

## Technologies Used

- **Python 3.8+** — core language
- **`json`** — parsing and serialising telemetry payloads
- **`logging`** — structured, timestamped pipeline logs
- **`datetime`** — UTC timestamp conversion
- **`argparse`** — CLI argument parsing
- **`unittest`** — built-in test framework (no pytest install needed)

---

## Project Structure

```
iot-telemetry-normalizer/
│
├── src/
│   ├── __init__.py            # Package marker
│   ├── logger_config.py       # Reusable logger factory
│   └── normalizer.py          # Core conversion logic (unit helpers, field extraction, I/O)
│
├── data/
│   ├── input/
│   │   └── sample_telemetry.json   # Raw device payload (5 records, mixed formats)
│   └── output/
│       └── normalized_telemetry.json   # Generated on first run
│
├── tests/
│   ├── __init__.py
│   └── test_normalizer.py     # 20 unit tests (no external dependencies)
│
├── main.py                    # Entry point — CLI + pipeline orchestration
├── requirements.txt           # No third-party deps; documents Python version
├── LICENSE                    # MIT
└── README.md                  # This file
```

---

## Example Input / Output

### Raw input (`data/input/sample_telemetry.json`)

```json
[
  {
    "device_id": "sensor-001",
    "ts": 1700000000,
    "temp_f": 98.6,
    "humidity_pct": 65.3,
    "battery_mv": 3700,
    "status": "active"
  },
  {
    "device_id": "sensor-002",
    "ts": 1700000060,
    "temperature": 22.0,
    "humidity": 71.5,
    "battery_mv": 3550,
    "status": "active"
  },
  {
    "device_id": "sensor-004",
    "ts": 1700000180,
    "temp_f": null,
    "humidity_pct": 55.0,
    "battery_mv": 3800,
    "status": "active"
  }
]
```

### Normalised output (`data/output/normalized_telemetry.json`)

```json
[
  {
    "device_id": "sensor-001",
    "timestamp_utc": "2023-11-14T22:13:20Z",
    "temperature_celsius": 37.0,
    "humidity_percent": 65.3,
    "battery_millivolts": 3700,
    "status": "active",
    "normalized": true
  },
  {
    "device_id": "sensor-002",
    "timestamp_utc": "2023-11-14T22:14:20Z",
    "temperature_celsius": 22.0,
    "humidity_percent": 71.5,
    "battery_millivolts": 3550,
    "status": "active",
    "normalized": true
  },
  {
    "device_id": "sensor-004",
    "timestamp_utc": "2023-11-14T22:16:20Z",
    "temperature_celsius": null,
    "humidity_percent": 55.0,
    "battery_millivolts": 3800,
    "status": "active",
    "normalized": true
  }
]
```

> **Note:** `sensor-004` has a null temperature in the raw data. The pipeline preserves this safely rather than crashing or silently dropping the record.

---

## How to Run Locally

### Prerequisites

- Python 3.8 or higher
- No third-party packages required

### Clone and run

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/iot-telemetry-normalizer.git
cd iot-telemetry-normalizer

# 2. Run with the included sample data
python main.py

# 3. Run with a custom input file
python main.py --input data/input/sample_telemetry.json --output data/output/normalized_telemetry.json
```

### Expected terminal output

```
[2025-05-28 12:00:00] INFO     __main__ — ============================================================
[2025-05-28 12:00:00] INFO     __main__ — IoT Telemetry Data Normalizer — Starting
[2025-05-28 12:00:00] INFO     __main__ — ============================================================
[2025-05-28 12:00:00] INFO     __main__ — Input  file : data/input/sample_telemetry.json
[2025-05-28 12:00:00] INFO     __main__ — Output file : data/output/normalized_telemetry.json
[2025-05-28 12:00:00] INFO     src.normalizer — Loading input file: data/input/sample_telemetry.json
[2025-05-28 12:00:00] INFO     src.normalizer — Loaded 5 raw record(s).
[2025-05-28 12:00:00] INFO     src.normalizer — Starting normalization of 5 record(s).
[2025-05-28 12:00:00] INFO     src.normalizer — Normalizing record for device: sensor-001
[2025-05-28 12:00:00] DEBUG    src.normalizer — Device 'sensor-001': converted temp_f=98.6°F → 37.00°C
[2025-05-28 12:00:00] INFO     src.normalizer — Device 'sensor-001' normalized successfully → temp=37.00°C, humidity=65.30%, battery=3700mV
...
[2025-05-28 12:00:00] INFO     src.normalizer — Normalization complete — 5 succeeded, 0 skipped.
[2025-05-28 12:00:00] INFO     __main__ — Pipeline complete. 5 record(s) written to 'data/output/normalized_telemetry.json'.
```

---

## Running the Tests

The test suite uses only Python's built-in `unittest` — no extra install needed.

```bash
# Run all tests with verbose output
python -m unittest tests/test_normalizer.py -v
```

### Sample test output

```
test_all_valid_records ... ok
test_empty_list ... ok
test_extract_humidity_from_humidity ... ok
test_extract_humidity_from_humidity_pct ... ok
test_extract_humidity_missing ... ok
test_extract_humidity_null ... ok
test_extract_temperature_from_temp_f ... ok
test_extract_temperature_from_temperature ... ok
test_extract_temperature_missing_field ... ok
test_extract_temperature_null_temp_f ... ok
test_fahrenheit_to_celsius_body_temp ... ok
test_fahrenheit_to_celsius_boiling ... ok
test_fahrenheit_to_celsius_freezing ... ok
test_fahrenheit_to_celsius_negative ... ok
test_invalid_records_are_skipped ... ok
test_missing_device_id_returns_none ... ok
test_missing_timestamp_returns_none ... ok
test_mixed_temperature_fields ... ok
test_null_temperature_produces_none_field ... ok
test_unix_to_iso8601_known_value ... ok
test_unix_to_iso8601_modern ... ok

----------------------------------------------------------------------
Ran 21 tests in 0.003s

OK
```

---

## Screenshots

> _Add screenshots of your terminal output here once you run the project._

**Terminal — pipeline log output**

```
[ Your screenshot here — e.g. terminal showing the INFO/DEBUG log lines ]
```

**Output file — normalized JSON**

```
[ Your screenshot here — e.g. VS Code or terminal showing the output JSON ]
```

---

## Future Improvements

- [ ] **Schema validation with Pydantic** — enforce types and ranges at the model level
- [ ] **Additional unit conversions** — wind speed (mph → km/h), pressure (psi → kPa)
- [ ] **Multi-file batch processing** — accept a directory of JSON files as input
- [ ] **Database integration** — write output directly to PostgreSQL or SQLite
- [ ] **REST API wrapper** — accept telemetry payloads via HTTP using FastAPI
- [ ] **CSV output option** — export normalised records as a `.csv` file
- [ ] **Anomaly flagging** — detect out-of-range readings (e.g. temperature > 100°C) and tag them
- [ ] **Docker support** — containerise the pipeline for easy deployment

---

## Resume Description

> Copy-paste into your resume or LinkedIn **Projects** section:

**IoT Telemetry Data Normalizer** | Python · JSON · Unit Testing · CLI  
Designed and built a data normalisation pipeline for heterogeneous IoT device telemetry as part of the Deloitte Technology Virtual Experience (Forage). The pipeline ingests raw JSON payloads with inconsistent field names and units, applies unit conversions (°F → °C, Unix → ISO 8601 UTC), validates required fields, and outputs a clean, consistent JSON schema. Implemented structured logging across all conversion steps, a 21-test `unittest` suite covering edge cases including null values and missing fields, and a CLI with configurable input/output paths. Zero third-party dependencies; runnable with a single Python command.

---

## License

This project is licensed under the [MIT License](LICENSE).
