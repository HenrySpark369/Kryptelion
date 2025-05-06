// --- Selectores de símbolo e intervalo ---
const SELECTOR_SYMBOL = document.getElementById("selectorSymbol");
const SELECTOR_INTERVAL = document.getElementById("selectorInterval");
import { DateTime } from 'luxon';
import 'chartjs-adapter-luxon';
Chart.register(window.ChartjsAdapterLuxon);

import { conectarWebSocket } from './ws-handler.js';
import { actualizarChart } from './grafico_utils.js';
import { actualizarSMA } from './indicadores.js';
import { onMessageHandler } from './procesador_kline.js';
import { analizarEstrategiaBackend } from './estrategias.js';
import { limpiarGrafico } from './session_utils.js';

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

// Carga el histórico inicial desde el backend antes de conectar el WebSocket
async function cargarHistoricoInicial() {
    try {
        const symbol = SELECTOR_SYMBOL.value || "BTCUSDT";
        const interval = SELECTOR_INTERVAL.value || "1m";
        const now = Date.now();
        const dias = 3;
        const startTime = now - dias * 24 * 60 * 60 * 1000;
        const endTime = now;
        const res = await fetch(`/historico?symbol=${symbol}&interval=${interval}&limit=100&startTime=${startTime}&endTime=${endTime}`);
        const respuesta = await res.json();
        const klines = respuesta.klines || [];
        if (klines.length === 0) {
            alert("No hay datos disponibles para el símbolo e intervalo seleccionados.");
            return;
        }

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
            // Se asume que la función modularizada de SMA se usará en otro lugar
            if (i + 1 >= smaWindow) {
                // calcularSMA está modularizada, pero aquí se puede importar si se requiere
                // Si necesitas calcular SMA aquí, importa calcularSMA desde el módulo adecuado
                // Por ahora, se deja el cálculo directo para mantener la funcionalidad
                const sma = precios.slice(i + 1 - smaWindow, i + 1).reduce((a, b) => a + b, 0) / smaWindow;
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
// Exporta onMessageHandler para uso en otros archivos JS si se desea
export { onMessageHandler };