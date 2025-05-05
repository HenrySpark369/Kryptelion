from config.settings import DB_PATH
from core.repository.historico_repository import HistoricoRepository
import requests
import time
from datetime import datetime, timezone
import os

def obtener_datos_historicos(symbols: list, intervals: list):
    """
    Descarga y almacena datos históricos desde Binance en una base de datos SQLite.
    """
    base_url = "https://api.binance.com/api/v3/klines"
    repo = HistoricoRepository(DB_PATH)

    try:
        for symbol in symbols:
            for interval in intervals:
                repo.crear_tabla_si_no_existe(symbol, interval)
                start_time = repo.obtener_ultimo_timestamp(symbol, interval) or 0

                print(f"Descargando datos para {symbol} en {interval} desde {start_time}...")

                while True:
                    params = {
                        "symbol": symbol,
                        "interval": interval,
                        "startTime": start_time,
                        "limit": 1500
                    }
                    try:
                        response = requests.get(base_url, params=params, timeout=10)
                        response.raise_for_status()
                        data = response.json()
                    except requests.exceptions.RequestException as e:
                        print(f"⚠️ Error en la solicitud: {e}. Reintentando en 5 segundos...")
                        time.sleep(5)
                        continue

                    if not data:
                        print("No hay más datos disponibles.")
                        break

                    rows = [(int(d[0]), float(d[1]), float(d[2]), float(d[3]), float(d[4]), float(d[5]),
                             int(d[6]), float(d[7]), int(d[8]), float(d[9]), float(d[10])) for d in data]

                    filtrados = [(r[0], r[1], r[2], r[3], r[4], r[5]) for r in rows]
                    repo.insertar_datos(symbol, interval, filtrados)

                    start_time = data[-1][0] + 1
                    print(f"Descargados {len(rows)} registros. Último timestamp: {start_time}")
                    time.sleep(2)
    finally:
        print("Proceso completado.")


def actualizar_datos(symbols: list, intervals: list):
    """
    Actualiza los datos históricos en la base de datos SQLite si hay nuevos registros.
    """
    base_url = "https://api.binance.com/api/v3/klines"
    interval_map = {
        "1m": 60000, "3m": 180000, "5m": 300000, "15m": 900000,
        "30m": 1800000, "1h": 3600000, "2h": 7200000, "4h": 14400000,
        "6h": 21600000, "8h": 28800000, "12h": 43200000, "1d": 86400000,
        "3d": 259200000, "1w": 604800000, "1M": 2592000000
    }

    repo = HistoricoRepository(DB_PATH)

    try:
        for symbol in symbols:
            for interval in intervals:
                repo.crear_tabla_si_no_existe(symbol, interval)
                last_timestamp = repo.obtener_ultimo_timestamp(symbol, interval)
                current_time = int(datetime.now(timezone.utc).timestamp() * 1000)

                if last_timestamp:
                    next_update_time = last_timestamp + interval_map[interval]
                    if current_time < next_update_time:
                        print(f"✅ {symbol}_{interval} actualizado hasta {datetime.utcfromtimestamp(last_timestamp / 1000)}.")
                        continue

                start_time = last_timestamp + 1 if last_timestamp else 0
                print(f"🔄 Actualizando {symbol} en {interval} desde {start_time}...")

                while True:
                    params = {
                        "symbol": symbol,
                        "interval": interval,
                        "startTime": start_time,
                        "limit": 1000
                    }
                    try:
                        response = requests.get(base_url, params=params, timeout=10)
                        response.raise_for_status()
                        data = response.json()
                    except requests.exceptions.RequestException as e:
                        print(f"⚠️ Error en la solicitud: {e}. Reintentando en 5 segundos...")
                        time.sleep(5)
                        continue

                    if not data:
                        print(f"✅ No hay nuevos datos para {symbol} en {interval}.")
                        break

                    rows = [(int(d[0]), float(d[1]), float(d[2]), float(d[3]), float(d[4]), float(d[5]),
                             int(d[6]), float(d[7]), int(d[8]), float(d[9]), float(d[10])) for d in data]

                    filtrados = [(r[0], r[1], r[2], r[3], r[4], r[5]) for r in rows]
                    repo.insertar_datos(symbol, interval, filtrados)

                    start_time = data[-1][0] + 1
                    print(f"⬆️ {len(rows)} registros insertados en {symbol}_{interval}. Último timestamp: {start_time}")
                    time.sleep(1)
    finally:
        print("🔄 Actualización completada.")

if __name__ == "__main__":
    symbols_env = os.getenv("SYMBOLS", "BTCUSDT,ETHUSDT, SOLUSDT")
    intervals_env = os.getenv("INTERVALS", "1m,5m,15m")
    symbols = [s.strip() for s in symbols_env.split(",") if s.strip()]
    intervals = [i.strip() for i in intervals_env.split(",") if i.strip()]

    actualizar_datos(symbols, intervals)

def obtener_klines_binance(symbol: str, interval: str, limit: int = 100):
    """
    Consulta directa a la API de Binance para obtener klines sin escribir en DB.
    """
    base_url = "https://api.binance.com/api/v3/klines"
    params = {
        "symbol": symbol,
        "interval": interval,
        "limit": limit
    }

    try:
        response = requests.get(base_url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"⚠️ Error al obtener klines de Binance: {e}")
        return []