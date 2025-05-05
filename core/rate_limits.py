import time
import requests
from config import settings

EXCHANGE_INFO_URL = f"{settings.BINANCE_BASE_URL}/fapi/v1/exchangeInfo"

def obtener_limits():
    try:
        res = requests.get(EXCHANGE_INFO_URL)
        res.raise_for_status()
        data = res.json()
        return data.get("rateLimits", [])
    except Exception as e:
        print(f"Error al obtener rate limits: {e}")
        return []

def manejar_errores_de_rate_limit(response):
    if response.status_code == 429:
        print("⚠️  Rate limit alcanzado (HTTP 429). Deteniendo temporalmente...")
        retry_after = int(response.headers.get("Retry-After", 3))
        time.sleep(retry_after)
        return True
    return False
