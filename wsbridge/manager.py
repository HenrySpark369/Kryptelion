import asyncio
import json

class WebSocketManager:
    def __init__(self):
        self.clientes = set()

    def registrar_cliente(self, websocket):
        self.clientes.add(websocket)
        addr = getattr(websocket, "remote_address", "desconocido")
        print(f"[Manager] Cliente registrado: {addr}")
        # La gestión del cierre se realiza desde el servidor principal.

    def eliminar_cliente(self, websocket):
        self.clientes.discard(websocket)
        addr = getattr(websocket, "remote_address", "desconocido")
        print(f"[Manager] Cliente eliminado: {addr}")

    async def enviar_a_todos(self, kline):
        mensaje = json.dumps(kline)
        if self.clientes:
            await asyncio.gather(*[
                self._safe_send(cliente, mensaje)
                for cliente in self.clientes
            ])

    async def _safe_send(self, cliente, mensaje):
        try:
            await cliente.send(mensaje)
        except Exception as e:
            print(f"[Manager] Error enviando a {getattr(cliente, 'remote_address', 'desconocido')}: {e}")
            self.eliminar_cliente(cliente)

    def numero_clientes(self):
        return len(self.clientes)
