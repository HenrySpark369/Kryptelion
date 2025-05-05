from core.repository.loader_repository import LoaderRepository
from config.settings import DB_PATH

def cargar_datos(symbol, interval, start=None, end=None):
    repo = LoaderRepository(DB_PATH)
    return repo.cargar_datos(symbol, interval, start, end)
