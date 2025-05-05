# Rutas de Métricas (`app/routes/metrics.py`)

Este módulo expone endpoints HTTP para monitoreo del sistema y del cliente WebSocket.

---

## Endpoints

### 📊 `/metrics/ws`

Métricas relacionadas con el WebSocket Binance:

- `websocket_log_cleanup_count`
- `last_message_time`
- `latency_seconds`
- `connected`
- `latency_threshold`
- `disconnect_threshold`

Formatos:
- `application/json` (por defecto)
- `text/plain` (Prometheus-compatible si `Accept: text/plain`)

Ejemplo JSON:
```json
{
  "websocket_log_cleanup_count": 3,
  "last_message_time": 1714920380.0,
  "latency_seconds": 4.2,
  "connected": true,
  "latency_threshold": 60,
  "disconnect_threshold": 120
}
```

---

### 💻 `/metrics/system`

Métricas del sistema:

- `cpu_percent`
- `memory_percent`
- `disk_percent`
- `temperature_celsius`
- `temperature_alert`
- `temperature_threshold`

Formatos:
- `application/json` (por defecto)
- `text/plain` (Prometheus-compatible si `Accept: text/plain`)

Ejemplo JSON:
```json
{
  "cpu_percent": 15.0,
  "memory_percent": 40.2,
  "disk_percent": 55.6,
  "temperature_celsius": 72.3,
  "temperature_alert": 0,
  "temperature_threshold": 85
}
```

---

## ⚙️ Umbrales configurables (via variables de entorno)

- `TEMP_ALERT_THRESHOLD` (°C, default: `85`)
- `LATENCY_ALERT_THRESHOLD` (segundos, default: `60`)
- `DISCONNECT_ALERT_THRESHOLD` (segundos, default: `120`)
- `TEMP_ALERT_WEBHOOK_URL` (URL para enviar notificaciones vía HTTP POST)

---

## 🚨 Alertas

Si se supera un umbral configurado, se:

- Registra un log `[WS-ALERT]`
- Envía POST JSON a `TEMP_ALERT_WEBHOOK_URL` (si está definido)

---

## 🛠️ Integración con Prometheus

Para que Prometheus scrappee estas métricas, agrega lo siguiente a tu `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'trading_bot'
    static_configs:
      - targets: ['localhost:5000']
```

> Asegúrate de que el servicio Flask esté corriendo en el puerto 5000.

---

## 📤 Formato de alerta HTTP POST

Si se define `TEMP_ALERT_WEBHOOK_URL`, se enviarán alertas con el siguiente formato JSON:

```json
{
  "temperatura": 92.5,
  "mensaje": "Temperatura crítica detectada",
  "timestamp": 1714920550.12
}
```

O para latencia:

```json
{
  "tipo": "latencia",
  "mensaje": "Latencia crítica WebSocket: 78.3 segundos",
  "latency": 78.3,
  "timestamp": 1714920588.90
}
```

---

## 🧹 Limpieza automática de logs

El sistema elimina archivos `.gz` en `logs/archived/` con más de 180 días. El número de archivos eliminados se expone en:

- `websocket_log_cleanup_count`

Esta limpieza se ejecuta automáticamente cada 24 horas si el cliente WebSocket está activo.

---

## ➕ Extender con nuevas métricas

Para agregar nuevas métricas al sistema:

1. Edita `app/routes/metrics.py`.
2. Añade nuevos valores en los endpoints `/metrics/ws` o `/metrics/system`.
3. Usa el formato dual `jsonify(...)` y `text/plain` para compatibilidad con Prometheus.
4. Si se desea generar alertas, reutiliza la función `enviar_alerta_webhook(...)`.

---

## 📘 Otras rutas disponibles

### `/dashboard`
Vista principal del sistema. Normalmente renderiza `templates/index.html` y muestra métricas en tiempo real del bot y su comportamiento.

- **Método**: GET
- **Ruta**: `/dashboard` o raíz `/`

---

### `/backtest` (en `backtest.py`)
Permite realizar pruebas retrospectivas (backtesting) sobre datos históricos utilizando estrategias definidas.

- **POST `/backtest`**: Ejecuta una estrategia sobre un conjunto de datos y devuelve resultados estadísticos y visuales.

> 💡 Generalmente recibe JSON con `symbol`, `interval`, `strategy`, `start_time`, `end_time`, etc.

---

### `/live` (en `live.py`)
Provee datos en vivo del mercado utilizando WebSocket o Server-Sent Events (SSE).

- **GET `/live/stream`**: Devuelve un flujo SSE con precios y señales en tiempo real.
- **GET `/live/data`**: Endpoint REST para obtener el último estado de los datos sin mantener conexión persistente.

---

### `/ordenes` (en `ordenes.py`)
Manejo de órdenes en vivo o simuladas.

- **POST `/ordenes/nueva`**: Envía una nueva orden de compra o venta. Requiere parámetros como `symbol`, `side`, `quantity`, etc.
- **GET `/ordenes/estado`**: Devuelve el estado actual de todas las órdenes abiertas.

---

## 📦 Ejemplos de payload

### 🔁 `POST /ordenes/nueva`

```json
{
  "symbol": "BTCUSDT",
  "side": "BUY",
  "type": "MARKET",
  "quantity": 0.01
}
```

Parámetros comunes:
- `symbol`: par de trading en mayúsculas.
- `side`: `"BUY"` o `"SELL"`.
- `type`: `"MARKET"` o `"LIMIT"`.
- `quantity`: cantidad a comprar o vender.

---

### 📊 `POST /backtest`

```json
{
  "symbol": "ETHUSDT",
  "interval": "1h",
  "strategy": "sma_cruce",
  "start_time": "2024-01-01",
  "end_time": "2024-03-01",
  "params": {
    "sma_corta": 10,
    "sma_larga": 50
  }
}
```

Parámetros comunes:
- `symbol`: par de mercado (ej. `"ETHUSDT"`).
- `interval`: intervalo de velas (ej. `"1m"`, `"15m"`, `"1h"`).
- `strategy`: nombre de la estrategia a ejecutar.
- `start_time`, `end_time`: rango histórico.
- `params`: parámetros personalizados para la estrategia.

---