# wsbridge/servidor_ws.py

import asyncio
import json
import websockets
from wscliente.cliente_binance import BinanceWebSocket
from wsbridge.manager import WebSocketManager

manager = WebSocketManager()

async def manejar_cliente(websocket, path=None):
    manager.registrar_cliente(websocket)
    print(f"[WS] Cliente conectado: {websocket.remote_address}")
    try:
        while True:
            await asyncio.sleep(1)  # Mantener la conexión abierta
    except websockets.exceptions.ConnectionClosed:
        print(f"[WS] Cliente desconectado: {websocket.remote_address}")
    finally:
        manager.eliminar_cliente(websocket)

class AsyncBroadcast:
    def __init__(self, manager):
        self.manager = manager

    def __call__(self, kline):
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.manager.enviar_a_todos(kline))
        except RuntimeError:
            asyncio.run(self.manager.enviar_a_todos(kline))

def iniciar_binance_ws(symbol="btcusdt", interval="1m"):
    callback = AsyncBroadcast(manager)
    binance_ws = BinanceWebSocket(symbol=symbol, interval=interval, callback=callback)
    binance_ws.start()

async def iniciar_servidor_ws(host="0.0.0.0", puerto=8765):
    print(f"[WS] Iniciando servidor WebSocket en ws://{host}:{puerto}")
    server = await websockets.serve(
        manejar_cliente,
        host,
        puerto,
        ping_interval=None,
    )
    iniciar_binance_ws()  # arranca el WebSocket de Binance
    await server.wait_closed()

if __name__ == "__main__":
    print("[MAIN] Iniciando microservicio WebSocket...")
    import asyncio
    asyncio.run(iniciar_servidor_ws())
