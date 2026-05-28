"""
test_normalizer.py
------------------
Unit tests for the IoT Telemetry Data Normalizer.

Run with:
    python -m pytest tests/ -v
  or without pytest (standard library only):
    python -m unittest tests/test_normalizer.py
"""

import unittest

from src.normalizer import (
    fahrenheit_to_celsius,
    unix_to_iso8601,
    extract_temperature_celsius,
    extract_humidity,
    normalize_record,
    normalize_payload,
)


class TestUnitConversions(unittest.TestCase):
    """Tests for unit conversion helper functions."""

    def test_fahrenheit_to_celsius_boiling(self):
        """212°F should equal 100°C (boiling point of water)."""
        self.assertEqual(fahrenheit_to_celsius(212), 100.0)

    def test_fahrenheit_to_celsius_freezing(self):
        """32°F should equal 0°C (freezing point of water)."""
        self.assertEqual(fahrenheit_to_celsius(32), 0.0)

    def test_fahrenheit_to_celsius_body_temp(self):
        """98.6°F should equal 37°C (human body temperature)."""
        self.assertEqual(fahrenheit_to_celsius(98.6), 37.0)

    def test_fahrenheit_to_celsius_negative(self):
        """-40°F should equal -40°C (the two scales intersect here)."""
        self.assertEqual(fahrenheit_to_celsius(-40), -40.0)

    def test_unix_to_iso8601_known_value(self):
        """Unix 0 should map to 1970-01-01T00:00:00Z."""
        self.assertEqual(unix_to_iso8601(0), "1970-01-01T00:00:00Z")

    def test_unix_to_iso8601_modern(self):
        """A known modern timestamp should convert correctly."""
        result = unix_to_iso8601(1700000000)
        self.assertEqual(result, "2023-11-14T22:13:20Z")


class TestFieldExtraction(unittest.TestCase):
    """Tests for field extraction helpers."""

    def test_extract_temperature_from_temp_f(self):
        """Records with 'temp_f' should be converted to Celsius."""
        record = {"device_id": "d1", "temp_f": 32.0}
        self.assertEqual(extract_temperature_celsius(record), 0.0)

    def test_extract_temperature_from_temperature(self):
        """Records with 'temperature' (Celsius) should pass through unchanged."""
        record = {"device_id": "d1", "temperature": 25.0}
        self.assertEqual(extract_temperature_celsius(record), 25.0)

    def test_extract_temperature_null_temp_f(self):
        """A null 'temp_f' value should return None."""
        record = {"device_id": "d1", "temp_f": None}
        self.assertIsNone(extract_temperature_celsius(record))

    def test_extract_temperature_missing_field(self):
        """A record with no temperature field should return None."""
        record = {"device_id": "d1", "humidity_pct": 60.0}
        self.assertIsNone(extract_temperature_celsius(record))

    def test_extract_humidity_from_humidity_pct(self):
        """Records with 'humidity_pct' should extract correctly."""
        record = {"device_id": "d1", "humidity_pct": 65.3}
        self.assertEqual(extract_humidity(record), 65.3)

    def test_extract_humidity_from_humidity(self):
        """Records with 'humidity' should extract correctly."""
        record = {"device_id": "d1", "humidity": 70.0}
        self.assertEqual(extract_humidity(record), 70.0)

    def test_extract_humidity_null(self):
        """A null humidity value should return None."""
        record = {"device_id": "d1", "humidity_pct": None}
        self.assertIsNone(extract_humidity(record))

    def test_extract_humidity_missing(self):
        """A record with no humidity field should return None."""
        record = {"device_id": "d1"}
        self.assertIsNone(extract_humidity(record))


class TestNormalizeRecord(unittest.TestCase):
    """Tests for the normalize_record function."""

    def _make_record(self, **overrides):
        """Return a minimal valid record, with optional field overrides."""
        base = {
            "device_id": "sensor-test",
            "ts": 1700000000,
            "temp_f": 98.6,
            "humidity_pct": 65.0,
            "battery_mv": 3700,
            "status": "active",
        }
        base.update(overrides)
        return base

    def test_valid_record_fahrenheit(self):
        """A full valid record with temp_f should normalize correctly."""
        result = normalize_record(self._make_record())
        self.assertIsNotNone(result)
        self.assertEqual(result["device_id"], "sensor-test")
        self.assertEqual(result["temperature_celsius"], 37.0)
        self.assertEqual(result["humidity_percent"], 65.0)
        self.assertEqual(result["battery_millivolts"], 3700)
        self.assertEqual(result["status"], "active")
        self.assertEqual(result["timestamp_utc"], "2023-11-14T22:13:20Z")
        self.assertTrue(result["normalized"])

    def test_valid_record_celsius(self):
        """A record using 'temperature' (already Celsius) should pass through."""
        record = self._make_record(temperature=22.0)
        del record["temp_f"]
        result = normalize_record(record)
        self.assertIsNotNone(result)
        self.assertEqual(result["temperature_celsius"], 22.0)

    def test_missing_device_id_returns_none(self):
        """A record without 'device_id' should be skipped (returns None)."""
        record = self._make_record()
        del record["device_id"]
        result = normalize_record(record)
        self.assertIsNone(result)

    def test_missing_timestamp_returns_none(self):
        """A record without 'ts' should be skipped (returns None)."""
        record = self._make_record()
        del record["ts"]
        result = normalize_record(record)
        self.assertIsNone(result)

    def test_null_temperature_produces_none_field(self):
        """A null temperature should produce temperature_celsius=None, not crash."""
        record = self._make_record(temp_f=None)
        result = normalize_record(record)
        self.assertIsNotNone(result)
        self.assertIsNone(result["temperature_celsius"])

    def test_normalized_flag_is_true(self):
        """Every successfully normalized record should have normalized=True."""
        result = normalize_record(self._make_record())
        self.assertTrue(result["normalized"])


class TestNormalizePayload(unittest.TestCase):
    """Tests for the normalize_payload batch function."""

    def test_empty_list(self):
        """An empty input list should produce an empty output list."""
        self.assertEqual(normalize_payload([]), [])

    def test_all_valid_records(self):
        """All valid records should be present in the output."""
        records = [
            {"device_id": "d1", "ts": 1700000000, "temperature": 20.0, "humidity": 50.0, "battery_mv": 3600, "status": "active"},
            {"device_id": "d2", "ts": 1700000060, "temperature": 21.0, "humidity": 55.0, "battery_mv": 3500, "status": "active"},
        ]
        result = normalize_payload(records)
        self.assertEqual(len(result), 2)

    def test_invalid_records_are_skipped(self):
        """Records missing device_id or ts should be skipped without crashing."""
        records = [
            {"ts": 1700000000, "temperature": 20.0},  # missing device_id
            {"device_id": "d2", "temperature": 21.0},  # missing ts
            {"device_id": "d3", "ts": 1700000000, "temperature": 22.0, "humidity": 60.0, "battery_mv": 3500, "status": "active"},
        ]
        result = normalize_payload(records)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["device_id"], "d3")

    def test_mixed_temperature_fields(self):
        """Records using both 'temp_f' and 'temperature' should all normalize correctly."""
        records = [
            {"device_id": "d1", "ts": 1700000000, "temp_f": 32.0, "humidity_pct": 50.0, "battery_mv": 3600, "status": "active"},
            {"device_id": "d2", "ts": 1700000000, "temperature": 0.0, "humidity": 50.0, "battery_mv": 3600, "status": "active"},
        ]
        result = normalize_payload(records)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]["temperature_celsius"], 0.0)
        self.assertEqual(result[1]["temperature_celsius"], 0.0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
