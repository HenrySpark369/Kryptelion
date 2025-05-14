import asyncio
import json

class WebSocketManager:
    def __init__(self):
        self.clientes = {}  # cliente_id: stream

    def registrar_cliente(self, cliente_id, stream=None):
        self.clientes[cliente_id] = stream
        print(f"[Manager] Cliente registrado: {cliente_id}")

    def eliminar_cliente(self, cliente_id):
        if cliente_id in self.clientes:
            del self.clientes[cliente_id]
            print(f"[Manager] Cliente eliminado: {cliente_id}")

    async def enviar_a_todos(self, kline):
        mensaje = json.dumps(kline)
        if self.clientes:
            await asyncio.gather(*[
                self._safe_send(cliente_id, stream, mensaje)
                for cliente_id, stream in self.clientes.items()
            ])

    async def _safe_send(self, cliente_id, stream, mensaje):
        try:
            if hasattr(stream, "send"):
                await stream.send(mensaje)
            elif hasattr(stream, "put"):
                await stream.put(mensaje)
        except Exception as e:
            print(f"[Manager] Error enviando a {cliente_id}: {e}")
            self.eliminar_cliente(cliente_id)

    def numero_clientes(self):
        return len(self.clientes)
