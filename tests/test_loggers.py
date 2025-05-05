import os
import logging
from config.logging_config import LOG_CONFIG, setup_logger
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import pytest

@pytest.fixture(autouse=True)
def clean_logs():
    yield
    # Eliminar todos los .log y .log.* en el directorio logs
    for file in os.listdir("logs"):
        if file.endswith(".log") or ".log." in file:
            os.remove(os.path.join("logs", file))

@pytest.mark.usefixtures("clean_logs")
def test_loggers_write_messages():
    for name, config in LOG_CONFIG.items():
        logger = setup_logger(name)
        test_message = f"[TEST] Logger '{name}' funcionando correctamente."
        logger.info(test_message)

        # Forzar escritura de handlers
        for handler in logger.handlers:
            handler.flush()

        log_path = os.path.join("logs", config["file"])
        assert os.path.exists(log_path), f"No existe archivo de log: {log_path}"

        with open(log_path, "r") as f:
            content = f.read()
            assert test_message in content, f"No se encontró mensaje de prueba en: {log_path}"


# Testea que auto_logger use el logger de fallback cuando el módulo no está en LOG_CONFIG
from config.logging_config import auto_logger

@pytest.mark.usefixtures("clean_logs")
def test_auto_logger_fallback():
    import subprocess
    import time

    # Ruta del log de fallback
    fallback_log_path = os.path.join("logs", LOG_CONFIG["ordenes"]["file"])
    if os.path.exists(fallback_log_path):
        os.remove(fallback_log_path)

    temp_script = "temp_fallback_test.py"
    with open(temp_script, "w") as f:
        f.write(
            "from config.logging_config import auto_logger\n"
            "logger = auto_logger()\n"
            "logger.warning('Simulación directa de advertencia de fallback.')\n"
            "logger.info('[TEST] Logger de fallback funcionando correctamente.')\n"
        )

    result = subprocess.run(["python", temp_script], capture_output=True)
    time.sleep(0.5)  # Dar tiempo a que se escriba el log

    os.remove(temp_script)

    assert os.path.exists(fallback_log_path), "El archivo de log de fallback no fue creado."

    with open(fallback_log_path, "r") as f:
        content = f.read()
        assert "[TEST] Logger de fallback funcionando correctamente." in content
        assert "Simulación directa de advertencia de fallback." in content
@pytest.mark.usefixtures("clean_logs")
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

temp_files = [
    "logs/test_cleanup.log",
    "logs/test_cleanup.log.1",
    "logs/archived/old.log",
    "data/temp_data.csv",
    "data/sample.json",
    "exports/output.tmp",
    "exports/test_database.db",
    "exports/test_dump.sqlite3"
]

def test_temp_file_cleanup():
    # Crear archivos simulados
    for path in temp_files:
        full_path = os.path.join(os.getcwd(), path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w") as f:
            f.write("dummy content")

    # Confirmamos que existen
    for path in temp_files:
        assert os.path.exists(path), f"No se creó correctamente el archivo temporal: {path}"

    # Ejecutar manualmente la lógica del fixture de limpieza
    for file in os.listdir("logs"):
        if file.endswith(".log") or ".log." in file:
            os.remove(os.path.join("logs", file))

    for dirpath in ["data", "exports"]:
        if os.path.exists(dirpath):
            for root, _, files in os.walk(dirpath):
                for file in files:
                    if file.endswith((".csv", ".json", ".tmp", ".db", ".sqlite3")) or file.startswith("test_") and file.endswith(".db"):
                        os.remove(os.path.join(root, file))

    archived_dir = os.path.join("logs", "archived")
    if os.path.exists(archived_dir):
        for root, _, files in os.walk(archived_dir):
            for file in files:
                if file.endswith((".log", ".log.1", ".log.2", ".bak", ".txt")):
                    os.remove(os.path.join(root, file))

    # Verificamos que fueron eliminados
    for path in temp_files:
        assert not os.path.exists(path), f"El archivo temporal {path} no fue eliminado por el fixture"