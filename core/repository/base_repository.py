

import sqlite3
from contextlib import contextmanager
from config.settings import DB_PATH  # Asegúrate de que la ruta esté bien configurada

class BaseRepository:
    def __init__(self, db_path=DB_PATH):
        self.db_path = db_path

    @contextmanager
    def connect(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        try:
            yield cursor
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()

    def execute(self, query, params=()):
        with self.connect() as cursor:
            cursor.execute(query, params)

    def fetchone(self, query, params=()):
        with self.connect() as cursor:
            cursor.execute(query, params)
            return cursor.fetchone()

    def fetchall(self, query, params=()):
        with self.connect() as cursor:
            cursor.execute(query, params)
            return cursor.fetchall()