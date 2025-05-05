import sys
import os
import time

# Añadir la raíz del proyecto al PYTHONPATH
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from wscliente.cliente_binance import BinanceWebSocket

def imprimir_kline(kline):
    print(f"Candle recibido - Open: {kline['o']} Close: {kline['c']}")

if __name__ == "__main__":
    ws = BinanceWebSocket(symbol="btcusdt", interval="1m", callback=imprimir_kline)
    ws.start()
    
    try:
        print("Conectando a WebSocket... espera unos segundos para recibir velas.")
        time.sleep(15)
    finally:
        ws.stop()
        print("Conexión finalizada.")