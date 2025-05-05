# core/repository/historico_repository.py
import pandas as pd
from core.repository.base_repository import BaseRepository
import sqlite3
from datetime import datetime

class HistoricoRepository(BaseRepository):
    def __init__(self, db_path="datos_historicos.db"):
        self.db_path = db_path

    def crear_tabla_si_no_existe(self, symbol: str, interval: str):
        """
        Crea una tabla con nombre basado en símbolo e intervalo si no existe.
        """
        nombre_tabla = f"{symbol.lower()}_{interval.lower()}"
        if not nombre_tabla.isidentifier():
            raise ValueError("Nombre de tabla no válido")

        with sqlite3.connect(self.db_path) as conn:
            conn.execute(f"""
                CREATE TABLE IF NOT EXISTS {nombre_tabla} (
                    open_time INTEGER PRIMARY KEY,
                    open REAL,
                    high REAL,
                    low REAL,
                    close REAL,
                    volume REAL
                )
            """)

    def get_dataframe(self, table_name: str):
        """
        Devuelve los datos OHLCV de una tabla específica como DataFrame.
        """
        if not table_name.isidentifier():
            raise ValueError("Nombre de tabla no válido")

        try:
            query = f"""
                SELECT open_time, open, high, low, close, volume
                FROM {table_name}
                ORDER BY open_time ASC
            """
            rows = self.fetchall(query)
            df = pd.DataFrame(rows, columns=["open_time", "open", "high", "low", "close", "volume"])
            df["open_time"] = pd.to_datetime(df["open_time"], unit="ms")
            return df
        except Exception as e:
            print(f"[HistoricoRepository] Error: {e}")
            return None

    def obtener_ultimo_timestamp(self, symbol: str, interval: str) -> int:
        table_name = f"{symbol}_{interval}".replace("-", "_")
        query = f"SELECT MAX(open_time) FROM {table_name}"
        result = self.fetchone(query)
        if result and result[0]:
            return int(result[0])
        return 0  # o None, según lógica deseada

    def insertar_datos(self, symbol: str, interval: str, rows: list):
        table_name = f"{symbol.lower()}_{interval.lower()}".replace("-", "_")
        if not table_name.isidentifier():
            raise ValueError("Nombre de tabla no válido")

        query = f"""
            INSERT OR IGNORE INTO {table_name} (
                open_time, open, high, low, close, volume
            ) VALUES (?, ?, ?, ?, ?, ?)
        """
        with sqlite3.connect(self.db_path) as conn:
            conn.executemany(query, rows)

    def get_last_crosses(self, symbol: str, interval: str, limit: int = 10):
        """
        Obtiene los últimos cruces de medias móviles del historial almacenado en la base de datos.
        :param symbol: El símbolo del mercado (ej. 'BTCUSDT').
        :param interval: El intervalo de tiempo de las velas (ej. '1m', '5m').
        :param limit: El número máximo de cruces a devolver.
        :return: Una lista con los cruces de medias móviles.
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            query = """
            SELECT symbol, interval, time, sma_short, sma_long
            FROM cruces
            WHERE symbol = ? AND interval = ?
            ORDER BY time DESC
            LIMIT ?;
            """
            cursor.execute(query, (symbol, interval, limit))
            crosses = cursor.fetchall()
            conn.close()

            results = []
            for cross in crosses:
                try:
                    results.append({
                        'symbol': cross[0],
                        'interval': cross[1],
                        'time': datetime.utcfromtimestamp(cross[2]).strftime('%Y-%m-%d %H:%M:%S') if cross[2] else None,
                        'sma_short': cross[3],
                        'sma_long': cross[4]
                    })
                except Exception as inner_e:
                    print(f"[get_last_crosses] Error procesando fila: {cross} -> {inner_e}")
            return results

        except sqlite3.OperationalError as e:
            print(f"[get_last_crosses] Error SQL: {e}")
            return []
        except Exception as e:
            print(f"[get_last_crosses] Error general: {e}")
            return []

    def obtener_klines_db(self, symbol: str, interval: str, limit: int = 100, start_time: int = None, end_time: int = None):
        """
        Obtiene los últimos registros OHLCV desde la base de datos local para un símbolo e intervalo dado.
        
        Parámetros:
        - symbol (str): Símbolo del par de trading (ej. 'BTCUSDT').
        - interval (str): Intervalo de tiempo de las velas (ej. '1m').
        - limit (int): Cantidad máxima de registros a obtener (por defecto 100).
        
        Retorna:
        - list[dict]: Lista de diccionarios con claves:
            - "t": int (timestamp de apertura en milisegundos)
            - "c": str (precio de cierre)
            - "v": str (volumen)
            - "x": bool (si la vela está cerrada; siempre True para datos históricos)
        """
        table_name = f"{symbol.lower()}_{interval.lower()}".replace("-", "_")
        if not table_name.isidentifier():
            raise ValueError("Nombre de tabla no válido")
        query = f"""
            SELECT open_time, close, volume
            FROM {table_name}
            WHERE 1=1
        """
        params = []

        if start_time is not None:
            query += " AND open_time >= ?"
            params.append(start_time)
        if end_time is not None:
            query += " AND open_time <= ?"
            params.append(end_time)

        query += " ORDER BY open_time DESC LIMIT ?"
        params.append(limit)

        try:
            print(f"[obtener_klines_db] Consultando: {table_name} | Límite: {limit}")
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(query, params)
                rows = cursor.fetchall()

            # Invertir orden para que estén en orden ascendente de tiempo
            rows.reverse()
            print(f"[obtener_klines_db] Filas obtenidas: {len(rows)}")

            resultado = [{
                "t": int(open_time),
                "c": str(close),
                "v": str(volume),
                "x": True
            } for open_time, close, volume in rows]

            return resultado
        except Exception as e:
            import traceback
            print(f"[obtener_klines_db] Error al leer tabla {table_name}: {e}")
            traceback.print_exc()
            return []