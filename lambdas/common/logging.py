"""
Structured logging utilities.
"""
import logging
import json
from typing import Any, Dict

# Configure root logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance."""
    return logging.getLogger(name)


def log_context(logger: logging.Logger, level: str, message: str, **context: Any) -> None:
    """Log with structured context."""
    log_data = {"message": message, **context}
    log_func = getattr(logger, level.lower())
    log_func(json.dumps(log_data))
