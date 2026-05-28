"""
normalizer.py
-------------
Core logic for the IoT Telemetry Data Normalizer.

Converts raw, heterogeneous device telemetry payloads into a consistent,
cleaned JSON schema ready for storage or downstream processing.

Supported conversions:
  - Temperature: Fahrenheit → Celsius (field aliases: temp_f, temperature)
  - Humidity: percent passthrough (field aliases: humidity_pct, humidity)
  - Timestamp: Unix epoch (int) → ISO 8601 UTC string
  - Battery: millivolts passthrough
  - Status: string passthrough

Author: IoT Telemetry Normalizer Project
License: MIT
"""

import json
import os
from datetime import datetime, timezone
from typing import Any

from src.logger_config import get_logger

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Unit conversion helpers
# ---------------------------------------------------------------------------

def fahrenheit_to_celsius(temp_f: float) -> float:
    """
    Convert a temperature from Fahrenheit to Celsius.

    Args:
        temp_f: Temperature in degrees Fahrenheit.

    Returns:
        Temperature in degrees Celsius, rounded to 2 decimal places.

    Example:
        >>> fahrenheit_to_celsius(98.6)
        37.0
    """
    return round((temp_f - 32) * 5 / 9, 2)


def unix_to_iso8601(timestamp: int) -> str:
    """
    Convert a Unix epoch timestamp (seconds) to an ISO 8601 UTC string.

    Args:
        timestamp: Unix epoch time as an integer.

    Returns:
        UTC datetime string in the format 'YYYY-MM-DDTHH:MM:SSZ'.

    Example:
        >>> unix_to_iso8601(1700000000)
        '2023-11-14T22:13:20Z'
    """
    dt = datetime.fromtimestamp(timestamp, tz=timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------------------------------------------------------------------------
# Field extraction helpers
# ---------------------------------------------------------------------------

def extract_temperature_celsius(record: dict[str, Any]) -> float | None:
    """
    Extract and normalize the temperature field from a telemetry record.

    Handles two common raw field names:
      - 'temp_f'     → value is in Fahrenheit, convert to Celsius
      - 'temperature' → value is already in Celsius, use as-is

    Args:
        record: A single raw telemetry dictionary.

    Returns:
        Temperature in Celsius (float), or None if the field is missing
        or its value is null.
    """
    if "temp_f" in record:
        raw = record["temp_f"]
        if raw is None:
            logger.warning(
                "Device '%s': 'temp_f' field is null — temperature set to None.",
                record.get("device_id", "unknown"),
            )
            return None
        celsius = fahrenheit_to_celsius(float(raw))
        logger.debug(
            "Device '%s': converted temp_f=%.1f°F → %.2f°C",
            record.get("device_id", "unknown"),
            raw,
            celsius,
        )
        return celsius

    if "temperature" in record:
        raw = record["temperature"]
        if raw is None:
            logger.warning(
                "Device '%s': 'temperature' field is null — temperature set to None.",
                record.get("device_id", "unknown"),
            )
            return None
        logger.debug(
            "Device '%s': temperature already in Celsius: %.2f°C",
            record.get("device_id", "unknown"),
            raw,
        )
        return round(float(raw), 2)

    logger.warning(
        "Device '%s': no temperature field found (expected 'temp_f' or 'temperature').",
        record.get("device_id", "unknown"),
    )
    return None


def extract_humidity(record: dict[str, Any]) -> float | None:
    """
    Extract the humidity percentage from a telemetry record.

    Handles two common raw field names:
      - 'humidity_pct'
      - 'humidity'

    Args:
        record: A single raw telemetry dictionary.

    Returns:
        Humidity as a float percentage, or None if missing/null.
    """
    for field in ("humidity_pct", "humidity"):
        if field in record:
            raw = record[field]
            if raw is None:
                logger.warning(
                    "Device '%s': '%s' field is null — humidity set to None.",
                    record.get("device_id", "unknown"),
                    field,
                )
                return None
            return round(float(raw), 2)

    logger.warning(
        "Device '%s': no humidity field found (expected 'humidity_pct' or 'humidity').",
        record.get("device_id", "unknown"),
    )
    return None


# ---------------------------------------------------------------------------
# Main normalization logic
# ---------------------------------------------------------------------------

def normalize_record(record: dict[str, Any]) -> dict[str, Any] | None:
    """
    Normalize a single raw telemetry record into the standard schema.

    Standard output schema:
        {
            "device_id":           str,
            "timestamp_utc":       str  (ISO 8601),
            "temperature_celsius": float | None,
            "humidity_percent":    float | None,
            "battery_millivolts":  int | None,
            "status":              str | None,
            "normalized":          bool
        }

    Args:
        record: A raw telemetry dictionary from an IoT device.

    Returns:
        A normalized dictionary, or None if the record is critically invalid
        (e.g. missing device_id or timestamp).
    """
    device_id = record.get("device_id")
    if not device_id:
        logger.error("Skipping record — missing required field 'device_id': %s", record)
        return None

    raw_ts = record.get("ts")
    if raw_ts is None:
        logger.error(
            "Skipping device '%s' — missing required field 'ts' (timestamp).", device_id
        )
        return None

    logger.info("Normalizing record for device: %s", device_id)

    # Convert timestamp
    try:
        timestamp_utc = unix_to_iso8601(int(raw_ts))
    except (ValueError, TypeError) as exc:
        logger.error(
            "Device '%s': invalid timestamp '%s' — %s. Skipping.", device_id, raw_ts, exc
        )
        return None

    # Extract and convert fields
    temperature = extract_temperature_celsius(record)
    humidity = extract_humidity(record)

    battery_raw = record.get("battery_mv")
    battery = int(battery_raw) if battery_raw is not None else None

    status = record.get("status")

    normalized = {
        "device_id": device_id,
        "timestamp_utc": timestamp_utc,
        "temperature_celsius": temperature,
        "humidity_percent": humidity,
        "battery_millivolts": battery,
        "status": status,
        "normalized": True,
    }

    logger.info(
        "Device '%s' normalized successfully → temp=%.2f°C, humidity=%.2f%%, battery=%dmV",
        device_id,
        temperature if temperature is not None else 0.0,
        humidity if humidity is not None else 0.0,
        battery if battery is not None else 0,
    )

    return normalized


def normalize_payload(raw_records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Normalize a list of raw telemetry records.

    Skips records that are critically invalid (missing device_id or timestamp)
    and logs a warning for each one skipped.

    Args:
        raw_records: List of raw telemetry dictionaries.

    Returns:
        List of successfully normalized records.
    """
    logger.info("Starting normalization of %d record(s).", len(raw_records))

    results = []
    skipped = 0

    for i, record in enumerate(raw_records):
        normalized = normalize_record(record)
        if normalized is not None:
            results.append(normalized)
        else:
            skipped += 1
            logger.warning("Record at index %d was skipped due to validation errors.", i)

    logger.info(
        "Normalization complete — %d succeeded, %d skipped.",
        len(results),
        skipped,
    )
    return results


# ---------------------------------------------------------------------------
# File I/O helpers
# ---------------------------------------------------------------------------

def load_json(file_path: str) -> list[dict[str, Any]]:
    """
    Load and parse a JSON file containing a list of telemetry records.

    Args:
        file_path: Path to the input JSON file.

    Returns:
        Parsed list of dictionaries.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If the JSON is invalid or the top-level structure is not a list.
    """
    logger.info("Loading input file: %s", file_path)

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Input file not found: {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSON in '{file_path}': {exc}") from exc

    if not isinstance(data, list):
        raise ValueError(
            f"Expected a JSON array at the top level of '{file_path}', "
            f"got {type(data).__name__}."
        )

    logger.info("Loaded %d raw record(s) from '%s'.", len(data), file_path)
    return data


def save_json(data: list[dict[str, Any]], file_path: str) -> None:
    """
    Save a list of normalized records to a JSON file.

    Creates intermediate directories if they do not already exist.

    Args:
        data: List of normalized telemetry dictionaries.
        file_path: Destination file path.
    """
    os.makedirs(os.path.dirname(file_path), exist_ok=True)

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    logger.info("Output written to: %s (%d record(s))", file_path, len(data))
