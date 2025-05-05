import os
from config.logging_config import setup_logger, LOG_CONFIG

def test_log_rotation():
    logger_name = "ordenes"
    log_path = os.path.join("logs", LOG_CONFIG[logger_name]["file"])
    backup_path = log_path + ".1"

    # Asegura que el log principal y rotados estén limpios antes de empezar
    for path in [log_path, backup_path]:
        if os.path.exists(path):
            os.remove(path)

    logger = setup_logger(logger_name)

    # Genera suficiente contenido para forzar la rotación
    message = "x" * 1000  # ~1KB
    for _ in range(2000):  # Genera ~2MB
        logger.info(message)

    # Fuerza escritura
    for handler in logger.handlers:
        handler.flush()

    # Validar que el archivo rotado existe
    assert os.path.exists(backup_path), "No se encontró archivo de rotación (.log.1)"
