# config/settings.py

import os
from dotenv import load_dotenv

# Carga desde .env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

MODO = os.getenv("MODO_ENTORNO", "testnet").lower()

if MODO == "mainnet":
    BINANCE_API_KEY = os.getenv("BINANCE_MAINNET_API_KEY")
    BINANCE_API_SECRET = os.getenv("BINANCE_MAINNET_API_SECRET")
    BINANCE_BASE_URL = os.getenv("BINANCE_MAINNET_BASE_URL")
else:
    BINANCE_API_KEY = os.getenv("BINANCE_TESTNET_API_KEY")
    BINANCE_API_SECRET = os.getenv("BINANCE_TESTNET_API_SECRET")
    BINANCE_BASE_URL = os.getenv("BINANCE_TESTNET_BASE_URL")

# Ruta a la base de datos de históricos
DB_PATH = os.getenv("DB_PATH", "datos_historicos.db")