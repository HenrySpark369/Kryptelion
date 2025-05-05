import logging

def get_logger(name: str) -> logging.Logger:
    """
    Crea o devuelve un logger configurado con la misma política de rotación y compresión.
    """
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = TimedRotatingFileHandler(
            f"logs/{name}.log",
            when="midnight",
            backupCount=7,
            encoding="utf-8",
            utc=True,
            delay=True
        )
        handler.suffix = "%Y-%m-%d"
        handler.namer = namer
        handler.rotator = rotator
        handler.setFormatter(logging.Formatter('[%(asctime)s] %(levelname)s: %(message)s'))
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger