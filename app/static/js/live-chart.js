// --- Selectores de símbolo e intervalo ---
const SELECTOR_SYMBOL = document.getElementById("selectorSymbol");
const SELECTOR_INTERVAL = document.getElementById("selectorInterval");
import { DateTime } from 'luxon';
Chart.register(Chart.DateAdapter, DateTime);

const cruceSignals = [];

const ctx = document.getElementById('liveChart').getContext('2d');
const gradient = ctx.createLinearGradient(0, 0, 0, 400);
gradient.addColorStop(0, 'rgba(0, 123, 255, 0.4)');
gradient.addColorStop(1, 'rgba(0, 123, 255, 0)');
const data = {
    labels: [],
    datasets: [{
        label: 'Precio de cierre',
        data: [],
        borderColor: 'rgba(0, 123, 255, 1)',
        borderWidth: 2,
        fill: true,
        backgroundColor: gradient,
        // Mejora visualización de puntos y suavizado de línea
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.3
    },
    {
        type: 'bar',
        label: 'Volumen',
        data: [],
        backgroundColor: 'rgba(192, 75, 75, 0.3)',
        yAxisID: 'y1'
    },
    {
        label: 'SMA 10',
        data: [],
        borderColor: 'rgba(255, 206, 86, 1)',
        borderWidth: 1,
        borderDash: [5, 5],
        fill: false,
        tension: 0.1
    }]
};

const config = {
    type: 'line',
    data: data,
    options: {
        responsive: true,
        animation: false,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'minute',
                    tooltipFormat: 'll HH:mm',
                    displayFormats: {
                        minute: 'HH:mm'
                    }
                },
                ticks: {
                    color: '#888',
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 15
                },
                grid: {
                    color: 'rgba(200,200,200,0.1)'
                }
            },
            y: {
                beginAtZero: false,
                suggestedMin: 94000,
                suggestedMax: 95000,
                ticks: {
                    color: '#888',
                    callback: function(value) {
                        return '$' + value.toLocaleString();
                    }
                },
                grid: {
                    color: 'rgba(200,200,200,0.1)'
                }
            },
            y1: {
                position: 'right',
                beginAtZero: true,
                grid: {
                    drawOnChartArea: false,
                    color: 'rgba(200,200,200,0.1)'
                },
                ticks: {
                    color: '#888'
                }
            }
        },
        plugins: {
            annotation: {
                annotations: []
            },
            tooltip: {
                backgroundColor: '#222',
                titleColor: '#fff',
                bodyColor: '#ccc',
                borderColor: '#444',
                borderWidth: 1,
                callbacks: {
                    label: function(context) {
                        return 'Precio: $' + context.parsed.y.toFixed(2);
                    }
                }
            },
            legend: {
                labels: {
                    color: '#444',
                    font: {
                        size: 14
                    }
                }
            },
            title: {
                display: true,
                text: 'Histórico de Precios',
                color: '#222',
                font: {
                    size: 18
                }
            }
        }
    }
};

const chart = new Chart(ctx, config);

function actualizarChart(t, c, v, cerrado) {
    const data = chart.data;
    if (cerrado) {
        data.labels.push(t);
        data.datasets[0].data.push(c);
        data.datasets[1].data.push(v);
    } else {
        const lastIdx = data.labels.length - 1;
        if (lastIdx >= 0) {
            data.labels[lastIdx] = t;
            data.datasets[0].data[lastIdx] = c;
            data.datasets[1].data[lastIdx] = v;
        } else {
            data.labels.push(t);
            data.datasets[0].data.push(c);
            data.datasets[1].data.push(v);
        }
    }

    if (data.labels.length > 100) {
        data.labels.shift();
        data.datasets[0].data.shift();
        data.datasets[1].data.shift();
    }
}

function calcularSMA(datos, ventana) {
    const slice = datos.slice(-ventana);
    const suma = slice.reduce((a, b) => a + b, 0);
    return suma / ventana;
}

function actualizarSMA(cerrado) {
    const precios = chart.data.datasets[0].data;
    const smaData = chart.data.datasets[2].data;
    const smaWindow = 10;

    if (precios.length >= smaWindow) {
        const sma = calcularSMA(precios, smaWindow);
        if (cerrado) {
            smaData.push(sma);
        } else {
            if (smaData.length > 0) {
                smaData[smaData.length - 1] = sma;
            } else {
                smaData.push(sma);
            }
        }
        if (smaData.length > 100) {
            smaData.shift();
        }
    } else {
        if (cerrado) smaData.push(null);
        else if (smaData.length > 0) smaData[smaData.length - 1] = null;
        else smaData.push(null);
    }
}

function onMessageHandler(event) {
    const kline = JSON.parse(event.data);
    const t = new Date(kline.t);
    const c = parseFloat(kline.c);
    const v = parseFloat(kline.v);

    actualizarChart(t, c, v, kline.x);
    actualizarSMA(kline.x);
    chart.update();
    analizarEstrategiaBackend();
}

// Carga el histórico inicial desde el backend antes de conectar el WebSocket
async function cargarHistoricoInicial() {
    try {
        const symbol = SELECTOR_SYMBOL.value || "BTCUSDT";
        const interval = SELECTOR_INTERVAL.value || "1m";
        const now = Date.now();
        const unDia = 24 * 60 * 60 * 1000;
        const startTime = now - unDia;
        const endTime = now;
        const res = await fetch(`/historico?symbol=${symbol}&interval=${interval}&limit=100&startTime=${startTime}&endTime=${endTime}`);
        const respuesta = await res.json();
        const klines = respuesta.klines || [];

        const labels = [];
        const precios = [];
        const volumenes = [];
        const smaWindow = 10;
        const smaData = [];

        klines.forEach((k, i) => {
            const t = new Date(k.t);
            const c = parseFloat(k.c);
            const v = parseFloat(k.v);
            labels.push(t);
            precios.push(c);
            volumenes.push(v);

            if (i + 1 >= smaWindow) {
                const sma = calcularSMA(precios.slice(i + 1 - smaWindow, i + 1), smaWindow);
                smaData.push(sma);
            } else {
                smaData.push(null);
            }
        });

        chart.data.labels = labels;
        chart.data.datasets[0].data = precios;
        chart.data.datasets[1].data = volumenes;
        chart.data.datasets[2].data = smaData;

        chart.update();
        // Actualiza el título dinámicamente
        config.options.plugins.title.text = `Histórico de Precios - ${symbol}`;
        // Agrega el nombre legible del intervalo
        const intervalMap = {
            "1m": "1 minuto",
            "5m": "5 minutos",
            "15m": "15 minutos",
            "1h": "1 hora",
            "4h": "4 horas",
            "1d": "1 día"
        };
        const intervaloLegible = intervalMap[interval] || interval;
        config.options.plugins.title.text += ` (${intervaloLegible})`;
    } catch (error) {
        console.error("Error al cargar histórico inicial:", error);
    }
}

function conectarWebSocket() {
    const socket = new WebSocket(WS_URL);

    socket.onopen = () => console.log("✅ WebSocket conectado");
    socket.onmessage = onMessageHandler;
    socket.onerror = err => console.error("❌ WebSocket error:", err);
    socket.onclose = () => {
        console.warn("🔌 WebSocket cerrado. Reintentando en 5 segundos...");
        setTimeout(conectarWebSocket, 5000);
    };
}

// Permite al usuario cargar el histórico y conectar WebSocket tras seleccionar símbolo/intervalo
document.getElementById("cargarHistoricoBtn")?.addEventListener("click", () => {
    cargarHistoricoInicial().then(() => {
        conectarWebSocket();
    });
});

// Si quieres cargar automáticamente al inicio, descomenta:
cargarHistoricoInicial().then(() => { conectarWebSocket(); });

// Función para exportar señales de cruce a JSON
function exportarJSON(cruceSignals) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cruceSignals, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", "cruces.json");
    dlAnchor.click();
}

// Botón para exportar señales de cruce
document.getElementById("exportCruces").addEventListener("click", function () {
    exportarJSON(cruceSignals);
});

// Función para exportar señales de cruce a CSV
function exportarCSV(cruceSignals) {
    if (cruceSignals.length === 0) return;

    const headers = ["timestamp", "tipo", "precio", "sma"];
    const rows = cruceSignals.map(sig => [sig.timestamp, sig.tipo, sig.precio, sig.sma]);
    const csvContent = [headers, ...rows]
        .map(e => e.join(","))
        .join("\n");

    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", "cruces.csv");
    dlAnchor.click();
}

// Botón para exportar señales de cruce en CSV
document.getElementById("exportCSV").addEventListener("click", function () {
    exportarCSV(cruceSignals);
});

// Botón para exportar señales de cruce al backend Flask usando el nuevo endpoint
document.getElementById("enviarBackend").addEventListener("click", function () {
    fetch("/exportar_cruces", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            cruces: cruceSignals,
            tipo: "json"
        })
    })
    .then(res => res.json())
    .then(data => {
        console.log("✅ Cruces exportados:", data);
        alert("Cruces exportados correctamente al backend.");
    })
    .catch(err => {
        console.error("❌ Error al exportar cruces:", err);
        alert("Error al exportar cruces al backend.");
    });
});

document.getElementById("descargarCSVBackend").addEventListener("click", function () {
    const tipo = document.getElementById("filtroTipo").value;
    const url = tipo ? `/cruces_csv?tipo=${tipo}` : "/cruces_csv";
    const a = document.createElement("a");
    a.href = url;
    a.download = "cruces_backend.csv";
    a.click();
});
// Agrega la orden a la tabla de historial si existe
function agregarOrdenAHistorial(orden) {
    const tabla = document.getElementById("tabla-ordenes");
    if (!tabla) return;

    const row = tabla.insertRow(1);  // Insertar debajo del encabezado
    row.insertCell(0).textContent = new Date().toISOString();
    row.insertCell(1).textContent = orden.tipo === "BUY" ? "orden_inicial" : "orden_inversa";
    row.insertCell(2).textContent = orden.symbol || "BTCUSDT";
    row.insertCell(3).textContent = orden.side || orden.tipo;
    row.insertCell(4).textContent = orden.origQty || "0.001";
    row.insertCell(5).textContent = orden.status || "enviada";
}
// --- Resumen visual de señales ejecutadas (contador) ---
let contadorCompra = parseInt(localStorage.getItem("contadorCompra")) || 0;
let contadorVenta = parseInt(localStorage.getItem("contadorVenta")) || 0;
actualizarResumen();

function actualizarResumen() {
    const div = document.getElementById("resumenOrdenes");
    if (!div) return;
    div.innerHTML = `
        <strong>Resumen:</strong><br>
        Órdenes de compra: ${contadorCompra}<br>
        Órdenes de venta: ${contadorVenta}
    `;
}

// Actualiza contador tras cada ejecución
function registrarOrden(tipo) {
    if (tipo === "BUY") contadorCompra++;
    else if (tipo === "SELL") contadorVenta++;
    actualizarResumen();
    localStorage.setItem("contadorCompra", contadorCompra);
    localStorage.setItem("contadorVenta", contadorVenta);
}
function obtenerColorAnotacion(tipo) {
    const colorInput = document.getElementById(tipo === "buy" ? "colorCompra" : "colorVenta");
    // Devuelve el valor actual del input, o el color por defecto si no existe
    return colorInput ? colorInput.value : (tipo === "buy" ? "green" : "red");
}
// Recopila las últimas 50 velas y las envía al backend para análisis de estrategia
async function analizarEstrategiaBackend() {
    const klines = [];
    const labels = chart.data.labels;
    const precios = chart.data.datasets[0].data;
    const volumenes = chart.data.datasets[1].data;

    for (let i = 0; i < labels.length; i++) {
        klines.push({
            t: new Date(labels[i]).toISOString(),
            c: precios[i],
            v: volumenes[i] || 0
        });
    }

    try {
        const res = await fetch("/analizar_estrategia", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ klines: klines })
        });
        const data = await res.json();
        console.log("Resultado del análisis:", data);

        if (config.options.plugins.annotation.annotations.length > 20) {
            config.options.plugins.annotation.annotations.shift();
        }

        // Para órdenes simuladas, usar el símbolo actual seleccionado
        const symbol = SELECTOR_SYMBOL.value || "BTCUSDT";
        if (data.signal === "buy") {
            const t = new Date(data.timestamp);
            const currPrice = data.close;
            const annotation = {
                type: 'line',
                mode: 'vertical',
                scaleID: 'x',
                value: t,
                borderColor: obtenerColorAnotacion("buy"),
                borderWidth: 2,
                label: {
                    enabled: true,
                    content: `Compra\nSMA: ${data.sma.toFixed(2)}`,
                    position: 'top'
                }
            };
            config.options.plugins.annotation.annotations.push(annotation);
            cruceSignals.push({
                timestamp: t.toISOString(),
                tipo: 'compra',
                precio: currPrice,
                sma: data.sma
            });
            fetch("/exportar_cruces", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    cruces: [cruceSignals[cruceSignals.length - 1]],
                    tipo: "json"
                })
            })
            .then(res => res.json())
            .then(data => {
                console.log("📤 Cruce exportado automáticamente:", data);
            })
            .catch(err => {
                console.error("❌ Error al exportar automáticamente el cruce:", err);
            });
            fetch("/orden", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tipo: "market",
                    symbol: symbol,
                    side: "BUY",
                    quantity: 0.001
                })
            })
            .then(response => response.json())
            .then(data => {
                alert("✅ Orden de COMPRA enviada al backend");
                console.log(data);
                agregarOrdenAHistorial(data);
                registrarOrden("BUY");
            });
        } else if (data.signal === "sell") {
            const t = new Date(data.timestamp);
            const currPrice = data.close;
            const annotation = {
                type: 'line',
                mode: 'vertical',
                scaleID: 'x',
                value: t,
                borderColor: obtenerColorAnotacion("sell"),
                borderWidth: 2,
                label: {
                    enabled: true,
                    content: `Venta\nSMA: ${data.sma.toFixed(2)}`,
                    position: 'top'
                }
            };
            config.options.plugins.annotation.annotations.push(annotation);
            cruceSignals.push({
                timestamp: t.toISOString(),
                tipo: 'venta',
                precio: currPrice,
                sma: data.sma
            });
            fetch("/exportar_cruces", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    cruces: [cruceSignals[cruceSignals.length - 1]],
                    tipo: "json"
                })
            })
            .then(res => res.json())
            .then(data => {
                console.log("📤 Cruce exportado automáticamente:", data);
            })
            .catch(err => {
                console.error("❌ Error al exportar automáticamente el cruce:", err);
            });
            fetch("/orden", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tipo: "market",
                    symbol: symbol,
                    side: "SELL",
                    quantity: 0.001
                })
            })
            .then(response => response.json())
            .then(data => {
                alert("✅ Orden de VENTA enviada al backend");
                console.log(data);
                agregarOrdenAHistorial(data);
                registrarOrden("SELL");
            });
        }
    } catch (error) {
        console.error("Error al analizar estrategia:", error);
    }
}
// Observa cambios en el input de color y actualiza anotaciones existentes
function actualizarColoresAnotaciones() {
    const compraColor = obtenerColorAnotacion("buy");
    const ventaColor = obtenerColorAnotacion("sell");

    config.options.plugins.annotation.annotations.forEach(ann => {
        if (ann.label && typeof ann.label.content === "string" && ann.label.content.startsWith("Compra")) {
            ann.borderColor = compraColor;
        } else if (ann.label && typeof ann.label.content === "string" && ann.label.content.startsWith("Venta")) {
            ann.borderColor = ventaColor;
        }
    });

    chart.update();
}

["colorCompra", "colorVenta"].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
        input.addEventListener("input", actualizarColoresAnotaciones);
    }
});

// --- Modo Debug: Simulación de señales cada 10 segundos ---
const modoDebug = false;

if (modoDebug) {
    setInterval(() => {
        const now = new Date();
        const precioSimulado = 61000 + Math.random() * 500;
        const smaSimulada = precioSimulado - (Math.random() * 100);
        const tipo = Math.random() > 0.5 ? "buy" : "sell";

        const eventoFalso = {
            data: JSON.stringify({
                t: now.getTime(),
                c: precioSimulado.toFixed(2),
                v: (Math.random() * 2).toFixed(2),
                x: true  // vela cerrada
            })
        };

        onMessageHandler(eventoFalso);

        fetch("/analizar_estrategia", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ klines: [] })  // puedes reemplazar por datos reales si deseas
        });

        console.log("🔁 Modo debug: señal simulada", tipo);
    }, 10000);
}
// --- Función para limpiar el gráfico (datos y anotaciones) ---
function limpiarGrafico() {
    chart.data.labels = [];
    chart.data.datasets.forEach(dataset => {
        dataset.data = [];
    });
    if (config.options.plugins?.annotation?.annotations) {
        config.options.plugins.annotation.annotations = [];
    }
    cruceSignals.length = 0;
    contadorCompra = 0;
    contadorVenta = 0;
    localStorage.setItem("contadorCompra", "0");
    localStorage.setItem("contadorVenta", "0");
    actualizarResumen();
    // Limpiar la tabla de historial de órdenes si existe
    const tabla = document.getElementById("tabla-ordenes");
    if (tabla && tabla.rows.length > 1) {
        while (tabla.rows.length > 1) {
            tabla.deleteRow(1);
        }
    }
    chart.update();
}