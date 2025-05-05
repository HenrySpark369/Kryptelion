from config.settings import DB_PATH
import os
import sqlite3
from itertools import product
import pandas as pd
from binance.client import Client
from binance.exceptions import BinanceAPIException, BinanceRequestException
from dotenv import load_dotenv
from core.repository.export_repository import ExportRepository

# Cargar claves desde .env
load_dotenv()
API_KEY = os.getenv("BINANCE_API_KEY")
API_SECRET = os.getenv("BINANCE_API_SECRET")
client = Client(API_KEY, API_SECRET, testnet=True)

def obtener_info_cuenta():
    """
    Consulta información básica de la cuenta de futuros.
    """
    try:
        account_info = client.futures_account()
        data = {
            'totalWalletBalance': [account_info['totalWalletBalance']],
            'availableBalance': [account_info['availableBalance']],
            'totalUnrealizedProfit': [account_info['totalUnrealizedProfit']]
        }
        return pd.DataFrame(data)
    except BinanceAPIException as e:
        print(f"Error API Binance: {e.code} - {e.message}")
    except BinanceRequestException as e:
        print(f"Error de conexión: {e.message}")
    except Exception as e:
        print(f"Error inesperado: {e}")

def obtener_posiciones_abiertas():
    """
    Devuelve un DataFrame con las posiciones abiertas en futuros.
    """
    try:
        positions = client.futures_position_information()
        open_positions = [pos for pos in positions if float(pos['positionAmt']) != 0]
        df = pd.DataFrame(open_positions)
        return df[['symbol', 'positionAmt', 'entryPrice', 'unRealizedProfit', 'leverage', 'liquidationPrice', 'updateTime']]
    except BinanceAPIException as e:
        print(f"Error API Binance: {e.code} - {e.message}")
    except BinanceRequestException as e:
        print(f"Error de conexión: {e.message}")
    except Exception as e:
        print(f"Error inesperado: {e}")

def extraer(nuevo_db, symbols, intervals):
    repo = ExportRepository()
    repo.copiar_tablas(DB_PATH, nuevo_db, symbols, intervals)


# Funciones para exportar y consultar archivos de cruces
def guardar_datos_exportados(cruces, tipo="json"):
    import json
    from datetime import datetime

    output_dir = "data/exportados"
    os.makedirs(output_dir, exist_ok=True)
    filename = f"cruces_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{tipo}"
    ruta = os.path.join(output_dir, filename)

    if tipo == "json":
        with open(ruta, "w") as f:
            json.dump(cruces, f, indent=2)
        return ruta
    else:
        raise ValueError("Formato de exportación no soportado")

def consultar_exportaciones():
    export_dir = "data/exportados"
    return os.listdir(export_dir) if os.path.exists(export_dir) else []