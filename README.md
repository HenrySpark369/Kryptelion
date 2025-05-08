# 🧠 Bot de Trading con Flask, Binance y Visualización en Tiempo Real

Este proyecto es un sistema completo de análisis, backtesting y ejecución en tiempo real de estrategias de trading algorítmico usando la API de Binance para derivados. Está construido con Python y Flask, e incluye una visualización tipo TradingView con datos históricos y en vivo mediante WebSocket.

---

## 📁 Estructura del Proyecto

```
trading_bot/
│
├── app/                    # Aplicación web Flask
│   ├── routes/             # Rutas para dashboards, backtesting, órdenes, WebSocket
│   ├── templates/          # HTML con Jinja2
│   └── static/             # JS, CSS y visualización en tiempo real (Chart.js, WebSocket)
├── wsbridge/              # Microservicio WebSocket intermedio entre Binance y frontend
│
├── core/                   # Núcleo del bot y lógica de trading
│   ├── repository/         # Acceso desacoplado a base de datos (Repository Pattern)
│
├── data/                   # Scripts de carga, actualización y exportación
├── estrategias/            # Estrategias (SMA, ML, etc.)
├── indicadores/            # Cálculo de indicadores técnicos
├── websocket/              # Cliente WebSocket para Binance
├── backtesting/            # Motor de simulación histórica
├── config/                 # Configuraciones y secretos
├── tests/                  # Pruebas automatizadas
├── run.py                  # CLI de ejecución
└── requirements.txt        # Dependencias
```

---

## ⚙️ Instalación

1. **Clona el repositorio**
```bash
git clone https://github.com/tu_usuario/trading_bot.git
cd trading_bot
```

2. **Crea un entorno virtual**
```bash
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

3. **Instala las dependencias**
```bash
pip install -r requirements.txt
```

4. **Genera tu archivo `.env` desde el ejemplo**

Ejecuta el siguiente comando para copiar `config/.env.example` a `config/.env` (si aún no existe):

```bash
python setup_env.py
```

Luego revisa y edita `config/.env` con tus credenciales y parámetros de entorno.

5. **Configura las variables sensibles**

Edita el archivo `config/.env` con tus claves API y parámetros personalizados.

---

## 🚀 Uso

### 1. Ejecutar la app web (modo desarrollo)
```bash
python run.py
```
Accede a: [http://localhost:5000](http://localhost:5000) para datos en vivo  
o a: [http://localhost:5000/backtest-ui](http://localhost:5000/backtest-ui) para simulaciones.

### 2. Actualizar datos históricos
```python
from data.updater import obtener_datos_historicos
obtener_datos_historicos(["BTCUSDT"], ["1m", "5m"], "datos_historicos.db")
```
```python
# También puedes usar parámetros start_time y end_time opcionalmente
```

### 2.1 Exportar datos como CSV o JSON
```python
from data.exporter import exportar_datos
exportar_datos("BTCUSDT", "1m", formato="csv", salida="export_btc.csv")
```

### 3. Ejecutar un backtest vía API
```bash
curl -X POST http://localhost:5000/backtest \
     -H "Content-Type: application/json" \
     -d '{"symbol": "BTCUSDT", "interval": "1m", "strategy": "sma_cruce", "capital": 1000}'
```

---

## 🔄 API de Órdenes

## 📡 Rutas de la API

### 🔁 Backtesting
- `POST /backtest`: Ejecuta un backtest con datos históricos locales. Requiere en el cuerpo JSON:
  ```json
  {
    "symbol": "BTCUSDT",
    "interval": "1m",
    "strategy": "sma_cruce",
    "capital": 1000,
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
  }
  ```

### 🔎 Visualización y métricas
- `GET /metrics`: Devuelve métricas de uso del sistema, CPU, RAM, uptime, etc.
- `GET /cruces`: Devuelve señales de cruce de medias móviles detectadas.
- `GET /ultimos_cruces`: Devuelve últimos cruces detectados y guardados en DB.

### 📊 WebSocket
- WebSocket en `ws://localhost:8765/?symbol=BTCUSDT&interval=1m`: Stream de precios y velas actualizado en vivo desde Binance.

Puedes gestionar órdenes en tiempo real:

- `GET /ordenes`: lista todas las órdenes
- `GET /ordenes?symbol=BTCUSDT`: filtra por símbolo
- `GET /ordenes?estado=pendiente`: filtra por estado
- `POST /ordenes`: crea una nueva orden
- `PUT /ordenes/<id>`: actualiza el estado
- `DELETE /ordenes/<id>`: elimina una orden

Ejemplo de POST:
```json
{
  "symbol": "BTCUSDT",
  "lado": "compra",
  "precio": 29500.5,
  "cantidad": 0.01,
  "estado": "pendiente"
}
```

---

## 🧩 Patrones de Diseño

Este proyecto aplica varios patrones de software:

- **Strategy** → estrategias pluggables (`estrategias/base.py`)
- **Factory** → instanciación dinámica (`estrategias/factory.py`)
- **State** → control de lógica operativa (`core/state.py`)
- **Repository** → acceso a datos (`core/repository/`)
- **MVC** → estructura web con Flask

---

## 🧠 Estrategias Incluidas

- `sma_cruce.py`: Cruce de medias móviles simples.
- `ml_predictor.py`: Modelo ML (placeholder para predicción).
- `ml_predictor.py`: Placeholder actualmente. En versiones futuras se integrará con `scikit-learn` y pipelines de entrenamiento para señales predictivas.
- Sistema extensible vía `estrategias/factory.py`.

Las estrategias pueden integrarse con el sistema de difusión en tiempo real mediante `AsyncBroadcast`, para enviar señales directamente al frontend.

---

## 📊 Visualización

- Gráfico de velas con indicadores técnicos y volumen
- Carga inicial optimizada usando rangos `startTime` y `endTime`
- WebSocket en tiempo real con reconexión segura y soporte para múltiples clientes
- Panel de backtesting interactivo vía `/backtest-ui`

### 📁 JS Modular para Visualización

La lógica de la visualización está dividida en módulos dentro de `static/js/`:

- `ws-handler.js`: gestiona conexión y reconexión WebSocket.
- `grafico_utils.js`: renderiza el gráfico de velas y volumen.
- `indicadores.js`: calcula y aplica SMAs, EMAs, y otros indicadores.
- `procesador_kline.js`: transforma datos Kline para su uso en el gráfico.
- `estrategias.js`: integra señales de estrategia en el frontend.
- `session_utils.js`: mantiene estado de sesión y configuración.

Esto permite escalabilidad, reutilización y mantenimiento más sencillo del frontend.

---

## 🧪 Pruebas

Pruebas básicas disponibles:

```bash
pytest tests/
```

---

## ✅ WebSocket

Prueba de conexión WebSocket con Binance (usando Testnet o entorno real):

```bash
python websocket/test_ws_connection.py
```

También puedes probar el WebSocket local en `ws://localhost:8765/?symbol=BTCUSDT&interval=1m`, que transmite los datos en vivo recibidos desde Binance hacia múltiples clientes frontend mediante el servicio `wsbridge`.

Asegúrate de definir en tu archivo `.env`:

```
BINANCE_WS_URL=wss://fstream.binance.com/ws
```

o usar la testnet:

```
BINANCE_WS_URL=wss://stream.binancefuture.com/ws
```

Si estás en Mac M1/M2 y deseas usar TensorFlow localmente, instala:
pip install -r requirements.macos.txt

Este servicio permite multiplexado de múltiples clientes con reconexión automática y gestión de estado por símbolo/intervalo.

---

## 🔐 Seguridad y Buenas Prácticas

- API Keys protegidas en `.env`
- Separación total entre módulos: web, lógica, datos
- Repositorios desacoplados para persistencia
- Patrón de diseño aplicado correctamente

---

## 📘 Documentación Técnica

Consulta:

- `core/bot.py`: clase principal del bot
- `estrategias/`: lógica de decisiones
- `backtesting/simulador.py`: motor de simulación
- `app/templates/backtest.html`: visualizador de pruebas
- `wsbridge/`: capa intermedia que maneja multiplexado y reconexión WebSocket

---

## 🌐 Futuro y Mejoras

- Base de datos PostgreSQL integrada y operativa
- Añadir indicadores técnicos avanzados (MACD, Ichimoku)
- Integrar modelos ML y optimización con algoritmos genéticos
- Gestión de riesgo por orden en tiempo real
- Despliegue en Google Cloud Platform (VM + Base de datos)
- Optimización de estrategias con Grid Search y validación cruzada

---

## 🗺️ Diagrama de Arquitectura

![Arquitectura de Kryptelion](static/docs/arquitectura_kryptelion.png)

Este diagrama muestra el flujo entre componentes:
- Binance WebSocket → `websocket/client.py` → `wsbridge` → `frontend`
- Backend Flask con rutas REST para backtesting, métricas y órdenes
- Sistema desacoplado con patrones de diseño aplicados por módulo

---

## 🤝 Contribuciones

Pull requests y sugerencias son bienvenidas. Para cambios mayores, abre un issue primero para discutirlo.