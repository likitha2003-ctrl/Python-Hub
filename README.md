# IoT Telemetry Data Normalizer

A production-style Python project for normalizing and validating IoT telemetry data from multiple device formats into a unified schema.

## Features

- Normalize telemetry records from multiple input formats
- Structured logging with INFO / DEBUG / ERROR levels
- CLI execution support
- Automated validation pipeline
- 24 unit tests with edge case coverage
- Clean modular architecture
- Zero third-party dependencies

## Project Structure

```bash
iot-telemetry-normalizer/
│
├── data/
│   ├── input/
│   └── output/
│
├── src/
│   ├── normalizer.py
│   └── logger_config.py
│
├── tests/
│   └── test_normalizer.py
│
├── main.py
├── run.py
├── README.md
├── requirements.txt
└── LICENSE
```

## Technologies Used

- Python 3.12
- unittest
- argparse
- logging
- JSON processing

## Running the Project

```bash
python main.py
```

## Running Tests

```bash
python -m unittest tests/test_normalizer.py -v
```

## Sample Functionality

- Converts raw IoT telemetry into standardized schema
- Handles invalid/missing data safely
- Performs validation checks
- Generates normalized outputs

## Why This Project

This project was developed to simulate a real-world telemetry normalization and data engineering workflow commonly used in IoT monitoring systems and backend infrastructure pipelines.

## Author

Likitha  
GitHub: https://github.com/likitha2003-ctrl
