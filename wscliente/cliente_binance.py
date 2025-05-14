import websocket
import json
import threading
import os
import time
import logging

from wscliente.manejador_logs import get_logger
ws_logger = get_logger("websocket")

# URLs posibles para WebSocket Binance
# Spot real:      wss://stream.binance.com:9443/ws
# Futuros real:   wss://fstream.binance.com/ws
# Futuros testnet:wss://stream.binancefuture.com/ws

DEFAULT_WS_URL = "wss://fstream.binance.com/ws"

class BinanceWebSocket:
    def __init__(self, symbol="btcusdt", interval="1m", callback=None, max_reconnect_attempts=5, base_reconnect_delay=2):
        self.symbol = symbol.lower()
        self.interval = interval
        self.callback = callback
        self.max_reconnect_attempts = max_reconnect_attempts
        self.base_reconnect_delay = base_reconnect_delay
        self.log_cleanup_count = 0

        base_url = os.getenv("BINANCE_WS_URL", DEFAULT_WS_URL)
        self.ws_url = f"{base_url}/{self.symbol}@kline_{self.interval}"

        self.ws = None
        self.thread = None
        self.observers = []
        self.last_message_time = None
        self.running = False

    def on_message(self, ws, message):
        self.last_message_time = time.time()
        try:
            data = json.loads(message)
            kline = data.get("k", {})
            if self.callback:
                try:
                    self.callback(kline)
                except Exception as e:
                    ws_logger.error(f"[WS-CALLBACK] Error en callback: {e}")
            for observer in self.observers:
                try:
                    observer(kline)
                except Exception as e:
                    ws_logger.error(f"[WS-OBSERVER] Error en observer: {e}")
            # Enviar a wsbridge después de notificar a los observers
            try:
                import asyncio
                vela = {
                    "t": kline.get("t"),
                    "o": kline.get("o"),
                    "h": kline.get("h"),
                    "l": kline.get("l"),
                    "c": kline.get("c"),
                    "v": kline.get("v"),
                    "x": kline.get("x")
                }
                asyncio.run(self.enviar_a_wsbridge(vela))
            except Exception as e:
                ws_logger.error(f"[WS-BRIDGE] Error ejecutando asyncio.run: {e}")
        except Exception as e:
            ws_logger.error(f"[WS-MESSAGE] Error procesando mensaje: {e}")

    def seconds_since_last_message(self):
        if self.last_message_time is None:
            return None
        return time.time() - self.last_message_time

    def add_observer(self, observer):
        if callable(observer):
            self.observers.append(observer)

    def remove_observer(self, observer):
        if observer in self.observers:
            self.observers.remove(observer)

    def on_error(self, ws, error):
        ws_logger.error(f"[WS-ERROR] {time.strftime('%Y-%m-%d %H:%M:%S')} | Error: {error}")

    def on_close(self, ws, close_status_code, close_msg):
        ws_logger.warning(f"[WS-CLOSE] {time.strftime('%Y-%m-%d %H:%M:%S')} | Código: {close_status_code} - Motivo: {close_msg}")

    def on_open(self, ws):
        ws_logger.info(f"[WS-OPEN] {time.strftime('%Y-%m-%d %H:%M:%S')} | Conectado a {self.symbol.upper()} {self.interval}")

    def start(self):
        ws_logger.websocket_instance = self
        def run():
            reconnect_attempts = 0
            self.running = True
            while self.running:
                if reconnect_attempts > 0:
                    ws_logger.info(f"[WS-RECONNECT] {time.strftime('%Y-%m-%d %H:%M:%S')} | Intento #{reconnect_attempts} para {self.symbol.upper()} {self.interval}")
                self.ws = websocket.WebSocketApp(
                    self.ws_url,
                    on_message=self.on_message,
                    on_error=self.on_error,
                    on_close=self.on_close,
                    on_open=self.on_open
                )
                try:
                    ws_logger.info("Intentando conectar al WebSocket...")
                    self.ws.run_forever(ping_interval=30, ping_timeout=10)
                    try:
                        self.ws.close()
                    except:
                        pass
                    self.ws = None
                    reconnect_attempts = 0
                except Exception as e:
                    ws_logger.exception(f"Error en WebSocket: {e}")
                    reconnect_attempts += 1
                    if reconnect_attempts >= self.max_reconnect_attempts:
                        ws_logger.critical("Máximo número de reintentos alcanzado. Abortando reconexión.")
                        break
                if self.running:
                    wait_time = self.base_reconnect_delay * (2 ** min(reconnect_attempts, self.max_reconnect_attempts))
                    ws_logger.info(f"[WS-RECONNECT] Esperando {wait_time} segundos antes de reconectar...")
                    time.sleep(wait_time)

        self.thread = threading.Thread(target=run, daemon=True)
        self.thread.start()

        self.latency_thread = threading.Thread(target=self._monitor_latency, daemon=True)
        self.latency_thread.start()

        self.cleanup_thread = threading.Thread(target=self._scheduled_log_cleanup, daemon=True)
        self.cleanup_thread.start()

    def _monitor_latency(self):
        while self.running:
            if self.last_message_time is not None:
                seconds = self.seconds_since_last_message()
                if seconds and seconds > 60:
                    logging.warning(f"Sin mensajes del WebSocket desde hace {int(seconds)} segundos. Forzando reconexión...")
                    if self.is_connected():
                        try:
                            self.ws.close()
                        except Exception as e:
                            logging.error(f"Error al cerrar WebSocket para reconexión: {e}")
            time.sleep(10)

    def _scheduled_log_cleanup(self):
        while self.running:
            self._limpiar_logs_archivados()
            time.sleep(86400)  # cada 24 horas

    def get_log_cleanup_count(self):
        return self.log_cleanup_count


    # Limpieza de logs archivados antiguos (.gz) en logs/archived
    def _limpiar_logs_archivados(self, dias=180):
        limite = time.time() - dias * 86400  # 180 días por defecto
        carpeta = "logs/archived"
        contador = 0
        if os.path.exists(carpeta):
            for archivo in os.listdir(carpeta):
                if archivo.endswith(".gz"):
                    path = os.path.join(carpeta, archivo)
                    if os.path.isfile(path) and os.path.getmtime(path) < limite:
                        try:
                            os.remove(path)
                            contador += 1
                            if hasattr(ws_logger, "websocket_instance"):
                                ws_logger.websocket_instance.log_cleanup_count += 1
                            ws_logger.info(f"[WS-CLEANUP] Archivo eliminado por antigüedad: {archivo}")
                        except Exception as e:
                            ws_logger.error(f"[WS-CLEANUP] Error al eliminar {archivo}: {e}")
        ws_logger.info(f"[WS-CLEANUP] {contador} archivos eliminados con más de {dias} días")
    
    async def enviar_a_wsbridge(self, kline):
        import websockets
        try:
            async with websockets.connect("ws://wsbridge:8765") as ws:
                await ws.send(json.dumps(kline))
        except Exception as e:
            ws_logger.error(f"[WS-BRIDGE] Error al enviar a wsbridge: {e}")

    def is_connected(self):
        return bool(getattr(self.ws, "sock", None) and getattr(self.ws.sock, "connected", False))

    def stop(self):
        self.running = False
        if self.ws:
            try:
                self.ws.close()
            except Exception:
                pass
        if self.thread:
            self.thread.join()