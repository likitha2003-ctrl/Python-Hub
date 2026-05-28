"""
main.py
-------
Entry point for the IoT Telemetry Data Normalizer.

Usage:
    python main.py
    python main.py --input data/input/sample_telemetry.json
    python main.py --input data/input/sample_telemetry.json --output data/output/normalized.json

The script reads a JSON file containing raw IoT device telemetry records,
normalizes each record to a standard schema, and writes the cleaned output
to a JSON file.
"""

import argparse
import sys

from src.logger_config import get_logger
from src.normalizer import load_json, normalize_payload, save_json

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------

DEFAULT_INPUT = "data/input/sample_telemetry.json"
DEFAULT_OUTPUT = "data/output/normalized_telemetry.json"


# ---------------------------------------------------------------------------
# CLI argument parsing
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="IoT Telemetry Data Normalizer — Deloitte Forage Project",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py
  python main.py --input data/input/sample_telemetry.json
  python main.py --input my_data.json --output results/output.json
        """,
    )
    parser.add_argument(
        "--input",
        default=DEFAULT_INPUT,
        help=f"Path to the raw telemetry JSON file (default: {DEFAULT_INPUT})",
    )
    parser.add_argument(
        "--output",
        default=DEFAULT_OUTPUT,
        help=f"Path to write the normalized JSON output (default: {DEFAULT_OUTPUT})",
    )
    return parser.parse_args()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    """Run the telemetry normalization pipeline."""
    args = parse_args()

    logger.info("=" * 60)
    logger.info("IoT Telemetry Data Normalizer — Starting")
    logger.info("=" * 60)
    logger.info("Input  file : %s", args.input)
    logger.info("Output file : %s", args.output)

    # Step 1 — Load raw data
    try:
        raw_records = load_json(args.input)
    except (FileNotFoundError, ValueError) as exc:
        logger.error("Failed to load input: %s", exc)
        sys.exit(1)

    # Step 2 — Normalize
    normalized_records = normalize_payload(raw_records)

    if not normalized_records:
        logger.warning("No records were successfully normalized. Output file will not be written.")
        sys.exit(1)

    # Step 3 — Save output
    try:
        save_json(normalized_records, args.output)
    except OSError as exc:
        logger.error("Failed to write output file: %s", exc)
        sys.exit(1)

    logger.info("=" * 60)
    logger.info("Pipeline complete. %d record(s) written to '%s'.", len(normalized_records), args.output)
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
