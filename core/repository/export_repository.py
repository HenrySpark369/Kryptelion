def guardar_datos_exportados(datos, tipo="json"):
    return export_repo.guardar_exportacion(datos, tipo)

def consultar_exportaciones(tipo=None):
    return export_repo.obtener_exportaciones(tipo)

import sqlite3
from datetime import datetime

class ExportRepository:
    def __init__(self, db_path="data/cruces.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS cruces (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT,
                    tipo TEXT,
                    precio REAL,
                    sma REAL
                )
            """)

    def guardar_exportacion(self, datos, tipo="json"):
        with sqlite3.connect(self.db_path) as conn:
            for cruce in datos:
                conn.execute("""
                    INSERT INTO cruces (timestamp, tipo, precio, sma)
                    VALUES (?, ?, ?, ?)
                """, (
                    cruce.get("timestamp"),
                    cruce.get("tipo"),
                    cruce.get("precio"),
                    cruce.get("sma")
                ))
        return True

    def obtener_exportaciones(self, tipo=None):
        query = "SELECT timestamp, tipo, precio, sma FROM cruces"
        params = ()
        if tipo:
            query += " WHERE tipo = ?"
            params = (tipo,)
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(query, params)
            return [dict(zip(["timestamp", "tipo", "precio", "sma"], row)) for row in cursor.fetchall()]