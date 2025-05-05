import asyncio
import json

class WebSocketManager:
    def __init__(self):
        self.clientes = set()

    def registrar_cliente(self, websocket):
        self.clientes.add(websocket)
        print(f"[Manager] Cliente registrado: {websocket.remote_address}")
        websocket.on_close = lambda ws: self.eliminar_cliente(ws)

    def eliminar_cliente(self, websocket):
        self.clientes.discard(websocket)
        print(f"[Manager] Cliente eliminado: {websocket.remote_address}")

    async def enviar_a_todos(self, kline):
        mensaje = json.dumps(kline)
        if self.clientes:
            await asyncio.gather(*[
                self._safe_send(cliente, mensaje)
                for cliente in self.clientes
            ])

    async def _safe_send(self, cliente, mensaje):
        if hasattr(cliente, "closed") and await cliente.closed:
            self.eliminar_cliente(cliente)
            return
        try:
            await cliente.send(mensaje)
        except Exception as e:
            print(f"[Manager] Error enviando a {cliente.remote_address}: {e}")
            self.eliminar_cliente(cliente)

    def numero_clientes(self):
        return len(self.clientes)
