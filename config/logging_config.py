import logging
from logging.handlers import RotatingFileHandler
import os
import inspect

LOG_CONFIG = {
    "ordenes":        {"file": "ordenes.log",        "level": logging.INFO},
    "core":           {"file": "core.log",           "level": logging.INFO},
    "data":           {"file": "datos_historicos.log", "level": logging.INFO},
    "wscliente":      {"file": "wscliente.log",      "level": logging.INFO},
    "estrategias":    {"file": "estrategias.log",    "level": logging.INFO},
    "backtesting":    {"file": "backtest.log",       "level": logging.INFO},
    "app":            {"file": "app.log",            "level": logging.INFO},
    "indicadores":    {"file": "indicadores.log",    "level": logging.INFO},
    "tests":          {"file": "tests.log",          "level": logging.INFO},
    "run":            {"file": "run.log",            "level": logging.INFO},
}

def setup_logger(name):
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)

    logger = logging.getLogger(name)
    logger.setLevel(LOG_CONFIG[name]["level"])

    log_path = os.path.join(log_dir, LOG_CONFIG[name]["file"])
    handler = RotatingFileHandler(log_path, maxBytes=1_000_000, backupCount=5)
    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s", 
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    handler.setFormatter(formatter)

    # Limpiar handlers previos (clave para que el test no falle)
    logger.handlers.clear()
    logger.addHandler(handler)
    logger.propagate = False

    # Habilita log en consola si se activa DEBUG_MODE
    if os.getenv("DEBUG_MODE") == "1":
        console = logging.StreamHandler()
        console.setLevel(logging.DEBUG)
        console.setFormatter(formatter)
        logger.addHandler(console)

    return logger


# Auto-logger utility
import inspect
def auto_logger():
    caller = inspect.stack()[1]
    module = inspect.getmodule(caller[0])
    name = module.__name__.split(".")[0]
    if name not in LOG_CONFIG:
        fallback_logger = setup_logger("ordenes")
        fallback_logger.warning(f"Logger '{name}' no está definido en LOG_CONFIG. Usando 'ordenes'.")
        return fallback_logger
    return setup_logger(name)
