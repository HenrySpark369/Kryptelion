# wsbridge/servidor_ws.py

import asyncio
import json
import websockets
from wscliente.cliente_binance import BinanceWebSocket
from wsbridge.manager import WebSocketManager

manager = WebSocketManager()
binance_ws = None  # Instancia global para BinanceWebSocket

async def manejar_cliente(websocket, path=None):
    manager.registrar_cliente(websocket)
    print(f"[WS] Cliente conectado: {websocket.remote_address}")
    try:
        async for _ in websocket:
            pass  # Escuchar mensajes ping/pong u otros del cliente si es necesario
    except websockets.exceptions.ConnectionClosed:
        print(f"[WS] Cliente desconectado: {websocket.remote_address}")
    finally:
        manager.eliminar_cliente(websocket)

main_loop = None  # Loop principal para ejecución segura desde otros hilos

class AsyncBroadcast:
    def __init__(self, manager):
        self.manager = manager

    def __call__(self, kline):
        global main_loop
        try:
            if main_loop is None or not main_loop.is_running():
                print("[AsyncBroadcast] Loop principal no disponible o no está corriendo.")
                return
            asyncio.run_coroutine_threadsafe(self.manager.enviar_a_todos(kline), main_loop)
        except Exception as e:
            print(f"[AsyncBroadcast] Error lanzando tarea en loop principal: {e}")

def iniciar_binance_ws(symbol="btcusdt", interval="1m"):
    global binance_ws
    if binance_ws is None:
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
    global main_loop
    main_loop = asyncio.get_running_loop()
    await server.wait_closed()

if __name__ == "__main__":
    print("[MAIN] Iniciando microservicio WebSocket...")
    import asyncio
    asyncio.run(iniciar_servidor_ws())
