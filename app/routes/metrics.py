import os
import psutil
import time
import requests
from flask import Blueprint, jsonify, Response, request
from wscliente.cliente_binance import ws_logger

TEMP_ALERT_THRESHOLD = int(os.getenv("TEMP_ALERT_THRESHOLD", "85"))
LATENCY_ALERT_THRESHOLD = int(os.getenv("LATENCY_ALERT_THRESHOLD", "60"))
DISCONNECT_ALERT_THRESHOLD = int(os.getenv("DISCONNECT_ALERT_THRESHOLD", "120"))

alert_webhook_url = os.getenv("TEMP_ALERT_WEBHOOK_URL")

def enviar_alerta_webhook(data):
    if not alert_webhook_url:
        return
    ws_logger.info(f"[WS-ALERT] Enviando alerta a webhook: {alert_webhook_url}")
    try:
        requests.post(alert_webhook_url, json=data)
    except Exception as e:
        ws_logger.error(f"[WS-ALERT] Falló envío de notificación HTTP: {e}")

metrics_bp = Blueprint("metrics", __name__)

@metrics_bp.route("/metrics/ws")
def websocket_metrics():
    instance = getattr(ws_logger, "websocket_instance", None)
    if instance:
        count = instance.get_log_cleanup_count()
        last_ts = instance.last_message_time
        latency = instance.seconds_since_last_message()
        connected = instance.running
    else:
        count = 0
        last_ts = None
        latency = None
        connected = False

    # Alerta de latencia crítica WebSocket
    if instance and latency is not None and latency > LATENCY_ALERT_THRESHOLD and connected:
        ws_logger.warning(f"[WS-ALERT] Latencia WebSocket crítica: {latency:.1f} segundos")
        enviar_alerta_webhook({
            "tipo": "latencia",
            "mensaje": f"Latencia crítica WebSocket: {latency:.1f} segundos",
            "latency": latency,
            "timestamp": time.time()
        })

    # Alerta por desconexión prolongada del WebSocket
    if instance and not connected and last_ts and (time.time() - last_ts) > DISCONNECT_ALERT_THRESHOLD:
        ws_logger.warning("[WS-ALERT] WebSocket desconectado por más de 120 segundos")
        enviar_alerta_webhook({
            "tipo": "desconexion",
            "mensaje": "WebSocket desconectado por más de 120 segundos",
            "duracion": round(time.time() - last_ts, 1),
            "timestamp": time.time()
        })

    if request.accept_mimetypes["text/plain"]:
        return Response(
            f"websocket_log_cleanup_count {count}\n"
            f"websocket_last_message_time {last_ts or 0}\n"
            f"websocket_latency_seconds {latency or 0}\n"
            f"websocket_connected {int(connected)}\n"
            f"websocket_latency_threshold {LATENCY_ALERT_THRESHOLD}\n"
            f"websocket_disconnect_threshold {DISCONNECT_ALERT_THRESHOLD}\n",
            mimetype="text/plain"
        )

    return jsonify({
        "websocket_log_cleanup_count": count,
        "last_message_time": last_ts,
        "latency_seconds": latency,
        "connected": connected,
        "latency_threshold": LATENCY_ALERT_THRESHOLD,
        "disconnect_threshold": DISCONNECT_ALERT_THRESHOLD
    })


# System metrics endpoint
@metrics_bp.route("/metrics/system")
def system_metrics():
    cpu = psutil.cpu_percent(interval=0.5)
    mem = psutil.virtual_memory().percent
    disk = psutil.disk_usage("/").percent

    temp = None
    temps = psutil.sensors_temperatures()
    if temps:
        for label, entries in temps.items():
            if entries:
                temp = entries[0].current
                break

    alert = int(temp is not None and temp >= TEMP_ALERT_THRESHOLD)
    if alert:
        ws_logger.warning(f"[WS-ALERT] Temperatura crítica detectada: {temp} °C")
        enviar_alerta_webhook({
            "temperatura": temp,
            "mensaje": "Temperatura crítica detectada",
            "timestamp": time.time()
        })

    if request.accept_mimetypes["text/plain"]:
        return Response(
            f"system_cpu_percent {cpu}\n"
            f"system_memory_percent {mem}\n"
            f"system_disk_percent {disk}\n"
            f"system_temperature_celsius {temp or 0}\n"
            f"system_temperature_alert {alert}\n"
            f"system_temperature_threshold {TEMP_ALERT_THRESHOLD}\n",
            mimetype="text/plain"
        )

    return jsonify({
        "cpu_percent": cpu,
        "memory_percent": mem,
        "disk_percent": disk,
        "temperature_celsius": temp,
        "temperature_alert": alert,
        "temperature_threshold": TEMP_ALERT_THRESHOLD
    })

@metrics_bp.route("/metrics/ws/clients")
def websocket_client_count():
    instance = getattr(ws_logger, "websocket_instance", None)
    if instance and hasattr(instance, "numero_clientes"):
        count = instance.numero_clientes()
    else:
        count = 0

    if request.accept_mimetypes["text/plain"]:
        return Response(
            f"websocket_connected_clients {count}\n",
            mimetype="text/plain"
        )

    return jsonify({
        "websocket_connected_clients": count
    })