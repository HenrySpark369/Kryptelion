import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest

@pytest.fixture(autouse=True)
def clean_logs():
    yield
    # Eliminar todos los .log y .log.* en el directorio logs
    for file in os.listdir("logs"):
        if file.endswith(".log") or ".log." in file:
            os.remove(os.path.join("logs", file))
    # Eliminar archivos .csv, .json, .tmp, .db, .sqlite3 y archivos que empiezan con test_ y terminan en .db en data/ y exports/ (incluyendo subdirectorios)
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

@pytest.fixture
def setup_example_logs_and_data():
    # Crear logs de ejemplo
    os.makedirs("logs", exist_ok=True)
    with open("logs/ordenes.log", "w") as f:
        f.write("2025-05-05 12:00:00 | INFO | ordenes | Mensaje de ejemplo en ordenes.log\n")

    with open("logs/errores.log", "w") as f:
        f.write("2025-05-05 12:00:00 | ERROR | errores | Error de ejemplo en errores.log\n")

    # Crear archivos de datos de ejemplo
    os.makedirs("data", exist_ok=True)
    with open("data/test_dataset.json", "w") as f:
        f.write('{"example": 123}')

    os.makedirs("exports", exist_ok=True)
    with open("exports/resultados.csv", "w") as f:
        f.write("id,valor\n1,100\n")

    yield

    # Limpieza automática al finalizar el test
    for dirpath in ["logs", "data", "exports"]:
        for root, _, files in os.walk(dirpath):
            for file in files:
                path = os.path.join(root, file)
                if file.endswith((".log", ".json", ".csv")):
                    os.remove(path)

def pytest_configure(config):
    config.addinivalue_line(
        "markers", "backtest: marcar pruebas relacionadas con simulaciones o estrategias"
    )