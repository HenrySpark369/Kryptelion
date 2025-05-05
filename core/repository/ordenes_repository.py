# core/ordenes.py

import time
import hmac
import hashlib
import requests
from urllib.parse import urlencode

from config import settings
from core import rate_limits

from core.repository.base_repository import BaseRepository

API_KEY = settings.BINANCE_API_KEY
API_SECRET = settings.BINANCE_API_SECRET
BASE_URL = settings.BINANCE_BASE_URL
HEADERS = {"X-MBX-APIKEY": API_KEY}

def firmar_payload(payload: dict) -> str:
    query_string = urlencode(payload)
    firma = hmac.new(API_SECRET.encode(), query_string.encode(), hashlib.sha256).hexdigest()
    return query_string + f"&signature={firma}"

def enviar_orden_market(symbol: str, side: str, quantity: float) -> dict:
    url = f"{BASE_URL}/fapi/v1/order"
    timestamp = int(time.time() * 1000)

    payload = {
        "symbol": symbol.upper(),
        "side": side.upper(),
        "type": "MARKET",
        "quantity": quantity,
        "timestamp": timestamp
    }

    signed_query = firmar_payload(payload)
    response = requests.post(url, headers=HEADERS, params=signed_query)

    if rate_limits.manejar_errores_de_rate_limit(response):
        return {"error": "Rate limit alcanzado. Orden no enviada."}

    try:
        return response.json()
    except Exception as e:
        return {"error": str(e), "response": response.text}


# Nueva función para enviar una orden inversa
def enviar_orden_inversa(orden_original: dict) -> dict:
    """
    Envía una orden contraria para cerrar o revertir la operación anterior.
    """
    symbol = orden_original.get("symbol")
    side = orden_original.get("side")
    qty = float(orden_original.get("origQty", 0))

    if not symbol or qty == 0:
        return {"error": "Orden original inválida o sin cantidad."}

    lado_inverso = "SELL" if side.upper() == "BUY" else "BUY"
    return enviar_orden_market(symbol, lado_inverso, qty)


# === Implementación del patrón Command ===

class OrdenCommand:
    def ejecutar(self):
        raise NotImplementedError("Debe implementar el método ejecutar()")

class OrdenMarketCommand(OrdenCommand):
    def __init__(self, symbol: str, side: str, quantity: float):
        self.symbol = symbol
        self.side = side
        self.quantity = quantity

    def ejecutar(self):
        return enviar_orden_market(self.symbol, self.side, self.quantity)

class OrdenInversaCommand(OrdenCommand):
    def __init__(self, orden_original: dict):
        self.orden_original = orden_original

    def ejecutar(self):
        return enviar_orden_inversa(self.orden_original)

class OrdenesRepository(BaseRepository):
    def __init__(self, db_path="ordenes.db"):
        super().__init__(db_path)
        self._asegurar_tabla()

    def _asegurar_tabla(self):
        with self.connect() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ordenes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp INTEGER,
                    symbol TEXT,
                    lado TEXT,
                    precio REAL,
                    cantidad REAL,
                    estado TEXT,
                    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)

    def obtener_ordenes(self, symbol=None):
        with self.connect() as cursor:
            if symbol:
                cursor.execute("SELECT * FROM ordenes WHERE symbol = ? ORDER BY fecha DESC", (symbol,))
            else:
                cursor.execute("SELECT * FROM ordenes ORDER BY fecha DESC")
            columnas = [col[0] for col in cursor.description]
            return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]

    def eliminar_orden(self, id: int) -> bool:
        with self.connect() as cursor:
            cursor.execute("DELETE FROM ordenes WHERE id=?", (id,))
            return cursor.rowcount > 0

    def actualizar_estado(self, id: int, nuevo_estado: str) -> bool:
        with self.connect() as cursor:
            cursor.execute("UPDATE ordenes SET estado=? WHERE id=?", (nuevo_estado, id))
            return cursor.rowcount > 0