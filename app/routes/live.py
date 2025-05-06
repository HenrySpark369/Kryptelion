from wsbridge.manager import WebSocketManager
import asyncio
from flask import Blueprint, Response, request, stream_with_context
import json
from wscliente.cliente_binance import BinanceWebSocket
from data.export import guardar_datos_exportados, consultar_exportaciones
import logging

bp = Blueprint("live", __name__)

ws_manager = WebSocketManager()

active_ws = None

@bp.route("/stream")
def stream():
    import time

    symbol = request.args.get("symbol", "BTCUSDT").upper()
    interval = request.args.get("interval", "1m")
    valid_intervals = {"1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M"}

    if not symbol.isalnum() or not (6 <= len(symbol) <= 12):
        return Response("Invalid symbol parameter", status=400)

    if interval not in valid_intervals:
        return Response("Invalid interval parameter", status=400)

    def callback(kline):
        data = {
            "t": kline["t"],
            "c": kline["c"],
            "v": kline["v"],
            "x": kline["x"]
        }
        asyncio.run(ws_manager.enviar_a_todos(data))

    global active_ws
    if active_ws and active_ws.is_running():
        active_ws.stop()
        while active_ws.is_running():
            time.sleep(0.1)

    try:
        active_ws = BinanceWebSocket(symbol=symbol, interval=interval, callback=callback)
        import threading
        threading.Thread(target=active_ws.start, daemon=True).start()
    except Exception as e:
        error_msg = f"data: {json.dumps({'error': str(e)})}\n\n".encode("utf-8")
        def error_stream():
            yield error_msg
        return Response(stream_with_context(error_stream()), mimetype="text/event-stream")

    def event_stream():
        ws_manager.registrar_cliente(request)
        try:
            while True:
                time.sleep(1)  # Keep-alive or heartbeat
        except GeneratorExit:
            ws_manager.eliminar_cliente(request)

    return Response(stream_with_context(event_stream()), mimetype="text/event-stream")

from flask import jsonify
from core.repository.ordenes_repository import OrdenMarketCommand, OrdenInversaCommand

@bp.route("/orden", methods=["POST"])
def ejecutar_orden():
    data = request.json
    tipo = data.get("tipo")
    try:
        if tipo == "market":
            symbol = data["symbol"]
            side = data["side"]
            quantity = float(data["quantity"])
            comando = OrdenMarketCommand(symbol, side, quantity)
        elif tipo == "inversa":
            orden_original = data["orden_original"]
            comando = OrdenInversaCommand(orden_original)
        else:
            return jsonify({"error": "Tipo de orden no soportado"}), 400

        resultado = comando.ejecutar()
        return jsonify(resultado)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/analizar_estrategia", methods=["POST"])
def analizar_estrategia():
    from estrategias.sma_cruce import EstrategiaSMACruce
    import pandas as pd
    import logging

    datos = request.get_json()
    klines = datos.get("klines", [])
    window = datos.get("window", 10)

    logging.info(f"Solicitud recibida en /analizar_estrategia con {len(klines)} velas y window={window}")

    if not klines or len(klines) < 2:
        logging.warning("Datos insuficientes para análisis")
        return jsonify({"signal": "none", "reason": "not_enough_data"})

    try:
        df = pd.DataFrame(klines)

        if "t" not in df or "c" not in df:
            return jsonify({"signal": "none", "reason": "missing_fields"}), 400

        df["t"] = pd.to_datetime(df["t"], unit='ms', errors='coerce')
        df["close"] = pd.to_numeric(df["c"], errors='coerce')
        df["volume"] = pd.to_numeric(df.get("v", 0), errors='coerce')
        df.dropna(subset=["t", "close"], inplace=True)

        if df.empty or len(df) < 2:
            return jsonify({"signal": "none", "reason": "invalid_data"}), 400

        df.set_index("t", inplace=True)
        df.sort_index(inplace=True)

        estrategia = EstrategiaSMACruce(window=window)
        resultado = estrategia.analizar(df)

        if resultado:
            señal = resultado[-1]
            logging.info(f"Señal generada: {señal['signal']} en {señal['timestamp']}")
            return jsonify(señal)
        else:
            return jsonify({"signal": "none", "reason": "no_signal"})

    except Exception as e:
        logging.error(f"Error en /analizar_estrategia: {str(e)}")
        return jsonify({"signal": "none", "error": str(e)}), 500

@bp.route("/exportar_cruces", methods=["POST"])
def exportar_cruces():
    datos = request.get_json()
    cruces = datos.get("cruces", [])
    tipo = datos.get("tipo", "json")
    if not cruces:
        return jsonify({"error": "No se proporcionaron cruces para exportar"}), 400
    try:
        resultado = guardar_datos_exportados(cruces, tipo)
        return jsonify({"ok": resultado})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Endpoint para ejecutar el bot en vivo usando la clase Bot
from core.bot import Bot

@bp.route("/bot_en_vivo")
def bot_en_vivo():
    from queue import Queue, Full
    import threading
    import time

    symbol = request.args.get("symbol", "BTCUSDT").upper()
    interval = request.args.get("interval", "1m")
    estrategia_nombre = request.args.get("estrategia", "sma_cruce")

    valid_intervals = {"1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M"}
    if interval not in valid_intervals:
        return Response("Invalid interval parameter", status=400)

    q = Queue(maxsize=1000)
    bot = Bot(estrategia=estrategia_nombre)
    buffer = []

    def callback(kline):
        buffer.append({
            "t": kline["t"],
            "c": kline["c"],
            "v": kline["v"]
        })
        if len(buffer) > 50:
            buffer.pop(0)

        if len(buffer) >= 10:
            datos = [{"t": x["t"], "c": x["c"]} for x in buffer]
            accion = bot.procesar(datos)
        else:
            accion = "esperar"

        salida = {
            "timestamp": kline["t"],
            "close": kline["c"],
            "volumen": kline["v"],
            "accion": accion
        }

        asyncio.run(ws_manager.enviar_a_todos(salida))

        try:
            q.put_nowait(f"data: {json.dumps(salida)}\n\n".encode("utf-8"))
        except Full:
            pass

    def event_stream():
        while True:
            try:
                msg = q.get()
                yield msg
            except GeneratorExit:
                if active_ws and active_ws.is_running():
                    active_ws.stop()
                break

    global active_ws
    if active_ws and active_ws.is_running():
        active_ws.stop()
        while active_ws.is_running():
            time.sleep(0.1)

    try:
        active_ws = BinanceWebSocket(symbol=symbol, interval=interval, callback=callback)
        threading.Thread(target=active_ws.start, daemon=True).start()
    except Exception as e:
        error_msg = f"data: {json.dumps({'error': str(e)})}\n\n".encode("utf-8")
        def error_stream():
            yield error_msg
        return Response(stream_with_context(error_stream()), mimetype="text/event-stream")

    return Response(stream_with_context(event_stream()), mimetype="text/event-stream")

from core.repository.historico_repository import HistoricoRepository

@bp.route("/historico")
def historico():
    """
    Endpoint que retorna datos OHLCV históricos desde la base de datos local.

    Parámetros por query string:
    - symbol (str): Par de trading (ej. BTCUSDT). Por defecto: BTCUSDT
    - interval (str): Intervalo de las velas (ej. 1m, 5m, 1h). Por defecto: 1m
    - limit (int): Número de registros a devolver. Por defecto: 100
    - startTime (int, opcional): Timestamp de inicio en milisegundos desde epoch
    - endTime (int, opcional): Timestamp de fin en milisegundos desde epoch

    Retorna:
    - JSON con una lista de objetos OHLCV con claves:
      - "t": int (timestamp)
      - "c": str (precio de cierre)
      - "v": str (volumen)
      - "x": bool (vela cerrada)
    """
    symbol = request.args.get("symbol", "BTCUSDT").upper()
    interval = request.args.get("interval", "1m")
    limit = int(request.args.get("limit", 100))
    start_time = request.args.get("startTime", type=int)
    end_time = request.args.get("endTime", type=int)

    logging.warning(f"📡 /historico llamado con: symbol={symbol}, interval={interval}, limit={limit}, start_time={start_time}, end_time={end_time}")

    try:
        logging.info(f"/historico solicitado con symbol={symbol}, interval={interval}, limit={limit}, startTime={start_time}, endTime={end_time}")
        repo = HistoricoRepository()
        klines = repo.obtener_klines_db(symbol, interval, limit, start_time, end_time)
        logging.info(f"klines obtenidos: {len(klines) if klines else 'None'}")

        if not klines or not all(isinstance(k, dict) and all(key in k for key in ("t", "c", "v")) for k in klines):
            logging.error(f"Formato inválido de klines: {klines}")
            return jsonify({"error": "Formato inválido de los datos históricos"}), 500

        if not klines:
            logging.warning("❌ No se encontraron datos históricos. Revisa si la tabla existe o si los filtros excluyen todos los datos.")
            logging.warning(f"No se encontraron datos históricos para {symbol} en {interval} con los parámetros proporcionados.")
            return jsonify({"klines": [], "mensaje": f"No se encontraron datos para {symbol} en {interval}."})

        resultado = [{
            "t": int(k["t"]),
            "c": str(k["c"]),
            "v": str(k["v"]),
            "x": k.get("x", True)
        } for k in klines]

        return jsonify({"klines": resultado})
    except Exception as e:
        logging.error(f"Error en /historico: {str(e)}")
        return jsonify({"error": str(e)}), 500