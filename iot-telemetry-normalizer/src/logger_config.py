"""
logger_config.py
----------------
Configures a reusable logger for the IoT Telemetry Normalizer.

Usage:
    from src.logger_config import get_logger
    logger = get_logger(__name__)
"""

import logging
import sys


def get_logger(name: str) -> logging.Logger:
    """
    Create and return a configured logger instance.

    Args:
        name: Typically __name__ from the calling module.

    Returns:
        A Logger instance with a consistent format.
    """
    logger = logging.getLogger(name)

    # Only add handlers if the logger has none yet (avoids duplicate output)
    if not logger.handlers:
        logger.setLevel(logging.DEBUG)

        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(logging.DEBUG)

        formatter = logging.Formatter(
            fmt="[%(asctime)s] %(levelname)-8s %(name)s — %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger
