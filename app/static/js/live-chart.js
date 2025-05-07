import { aplicarEstilosModo } from './grafico_utils.js';
// --- Modo oscuro ---
function aplicarModoOscuro() {
    const body = document.body;
    const chartContainer = document.getElementById("chartContainer");

    body.classList.toggle("modo-oscuro");
    if (chartContainer) chartContainer.classList.toggle("modo-oscuro");

    const esModoOscuro = body.classList.contains("modo-oscuro");
    localStorage.setItem("modoOscuro", esModoOscuro ? "true" : "false");

    if (chart) {
        if (esModoOscuro) {
            chart.options.plugins.legend.labels.color = "#fff";
            chart.options.scales.x.ticks.color = "#fff";
            chart.options.scales.y.ticks.color = "#fff";
            if (chart.options.plugins.tooltip) {
                chart.options.plugins.tooltip.backgroundColor = "#333";
                chart.options.plugins.tooltip.titleColor = "#fff";
                chart.options.plugins.tooltip.bodyColor = "#fff";
                chart.options.plugins.tooltip.borderColor = "#555";
                chart.options.plugins.tooltip.borderWidth = 1;
            }
            chart.options.plugins.background = chart.options.plugins.background || {};
            chart.options.plugins.background.color = "#1e1e1e";
            chart.options.backgroundColor = "#1e1e1e";
        } else {
            // Restaurar colores para modo claro
            chart.options.plugins.legend.labels.color = "#000";
            chart.options.scales.x.ticks.color = "#000";
            chart.options.scales.y.ticks.color = "#000";
            if (chart.options.plugins.tooltip) {
                chart.options.plugins.tooltip.backgroundColor = "#fff";
                chart.options.plugins.tooltip.titleColor = "#000";
                chart.options.plugins.tooltip.bodyColor = "#000";
                chart.options.plugins.tooltip.borderColor = "#ccc";
                chart.options.plugins.tooltip.borderWidth = 1;
            }
            chart.options.plugins.background = chart.options.plugins.background || {};
            chart.options.plugins.background.color = "#ffffff";
            chart.options.backgroundColor = "#ffffff";
        }
        aplicarEstilosModo(chart, esModoOscuro);
        chart.update();

        const elementosUI = [SELECTOR_SYMBOL, SELECTOR_INTERVAL];
        elementosUI.forEach(elem => {
            if (elem) {
                elem.style.backgroundColor = esModoOscuro ? "#2c2c2c" : "#fff";
                elem.style.color = esModoOscuro ? "#fff" : "#000";
                elem.style.border = esModoOscuro ? "1px solid #555" : "1px solid #ccc";
            }
        });

        // Aplica modo oscuro a botones, selects y controles comunes
        const botones = document.querySelectorAll("button, select, input[type='button'], input[type='submit']");
        botones.forEach(btn => {
            btn.style.backgroundColor = esModoOscuro ? "#2c2c2c" : "#fff";
            btn.style.color = esModoOscuro ? "#fff" : "#000";
            btn.style.border = esModoOscuro ? "1px solid #555" : "1px solid #ccc";
        });
    }

    const toggleIcon = document.getElementById("toggleModoOscuro");
    if (toggleIcon) {
        toggleIcon.textContent = esModoOscuro ? "☀️" : "🌙";
    }
}

// Restaurar modo oscuro si estaba activado
if (!localStorage.getItem("modoOscuro")) {
    localStorage.setItem("modoOscuro", "true");
}
if (localStorage.getItem("modoOscuro") === "true") {
    setTimeout(() => aplicarModoOscuro(), 100);
}

const toggleOscuroBtn = document.getElementById("toggleModoOscuro");
if (toggleOscuroBtn) {
    toggleOscuroBtn.addEventListener("click", () => {
        aplicarModoOscuro();
    });

    // Actualiza el ícono del botón en la carga inicial
    document.addEventListener("DOMContentLoaded", () => {
        const esOscuro = document.body.classList.contains("modo-oscuro");
        toggleOscuroBtn.textContent = esOscuro ? "☀️" : "🌙";
    });
}

import { cargarIntervalos, INTERVALOS_VALIDOS, INTERVALOS_LABELS } from './constants.js';
await cargarIntervalos();
import { exportarJSON, exportarCSV, exportarABackend } from './export_utils.js';
import { activarModoDebug } from './debug_utils.js';
import { mostrarMensaje, obtenerColorAnotacion, actualizarColoresAnotaciones } from './ui_utils.js';
import { obtenerDatosHistoricos } from './data_loader.js';
const Chart = window.Chart;

import { conectarWebSocket, cerrarWebSocket, cerrarTodosLosSockets, reiniciarStream } from './ws-handler.js';
import { crearChart, actualizarChart, actualizarGraficoHistorico } from './grafico_utils.js';
import { onMessageHandlerFactory } from './procesador_kline.js';
import { analizarEstrategiaBackendFactory } from './estrategias.js';
import { limpiarGrafico, actualizarResumen, registrarOrden, agregarOrdenAHistorial } from './session_utils.js';
import { actualizarSMA } from './indicadores.js';

const cruceSignals = [];

// --- Selectores de símbolo e intervalo ---
const SELECTOR_SYMBOL = document.getElementById("selectorSymbol");
const SELECTOR_INTERVAL = document.getElementById("selectorInterval");
const ultimoInterval = localStorage.getItem("ultimoInterval");

// Limpia y repuebla el selector de intervalos basado en los datos cargados
if (SELECTOR_INTERVAL) {
    SELECTOR_INTERVAL.innerHTML = '';
    INTERVALOS_VALIDOS.forEach(intervalo => {
        const opt = document.createElement('option');
        opt.value = intervalo;
        opt.textContent = INTERVALOS_LABELS[intervalo];
        SELECTOR_INTERVAL.appendChild(opt);
    });
    if (ultimoInterval && INTERVALOS_VALIDOS.includes(ultimoInterval)) {
        SELECTOR_INTERVAL.value = ultimoInterval;
    }
}
// --- Restaurar última selección desde localStorage ---
const ultimoSymbol = localStorage.getItem("ultimoSymbol");
if (ultimoSymbol) SELECTOR_SYMBOL.value = ultimoSymbol;

// Asegura que el canvas exista antes de usarlo
const ctx = document.getElementById('liveChart')?.getContext('2d');
if (!ctx) {
    console.error("🎯 No se encontró el canvas #liveChart");
    throw new Error("Canvas 'liveChart' no encontrado");
}

const chart = crearChart(ctx);

const analizarEstrategiaBackend = analizarEstrategiaBackendFactory(chart);
const onMessageHandler = onMessageHandlerFactory(chart, (data) => actualizarChart(chart, data), actualizarSMA, analizarEstrategiaBackend);

// Carga el histórico inicial desde el backend antes de conectar el WebSocket
async function cargarHistoricoInicial() {
    try {
        const symbol = SELECTOR_SYMBOL?.value || "btcusdt";
        const interval = SELECTOR_INTERVAL?.value || "1m";
        const klines = await obtenerDatosHistoricos(symbol, interval);
        if (klines.length === 0) {
            if (mensajeSinDatos) mensajeSinDatos.classList.remove("d-none");
            return;
        } else {
            if (mensajeSinDatos) mensajeSinDatos.classList.add("d-none");
        }

        mostrarMensaje(`📈 Cargando gráfico para ${symbol} (${interval})...`);
        actualizarGraficoHistorico(chart, klines, symbol, interval);
    } catch (error) {
        console.error("Error al cargar histórico inicial:", error);
    }
}


// Permite al usuario cargar el histórico y conectar WebSocket tras seleccionar símbolo/intervalo
function handleCambioSimbolo() {
    localStorage.setItem("ultimoSymbol", SELECTOR_SYMBOL.value);
    localStorage.setItem("ultimoInterval", SELECTOR_INTERVAL.value);
    cargarHistoricoInicial().then(() => {
        const symbol = SELECTOR_SYMBOL?.value || "BTCUSDT";
        const interval = SELECTOR_INTERVAL?.value || "1m";
        reiniciarStream(symbol, interval, onMessageHandler);
    });
}
const cargarHistoricoBtn = document.getElementById("cargarHistoricoBtn");
if (cargarHistoricoBtn) {
    cargarHistoricoBtn.addEventListener("click", handleCambioSimbolo);
}

cargarHistoricoInicial().then(() => {
    const symbol = SELECTOR_SYMBOL.value || "BTCUSDT";
    const interval = SELECTOR_INTERVAL.value || "1m";
    reiniciarStream(symbol, interval, onMessageHandler);
});

// Botón para exportar señales de cruce
const exportCrucesBtn = document.getElementById("exportCruces");
if (exportCrucesBtn) {
    exportCrucesBtn.addEventListener("click", function () {
        exportarJSON(cruceSignals);
    });
}

// Botón para exportar señales de cruce en CSV
const exportCSVBtn = document.getElementById("exportCSV");
if (exportCSVBtn) {
    exportCSVBtn.addEventListener("click", function () {
        exportarCSV(cruceSignals);
    });
}

// Botón para exportar señales de cruce al backend usando exportarABackend
const enviarBackendBtn = document.getElementById("enviarBackend");
if (enviarBackendBtn) {
    enviarBackendBtn.addEventListener("click", function () {
        exportarABackend({ cruces: cruceSignals, tipo: "json" }, "/exportar_cruces");
    });
}

const descargarCSVBackendBtn = document.getElementById("descargarCSVBackend");
if (descargarCSVBackendBtn) {
    descargarCSVBackendBtn.addEventListener("click", function () {
        const filtroTipoElem = document.getElementById("filtroTipo");
        const tipo = filtroTipoElem?.value;
        const url = tipo ? `/cruces_csv?tipo=${tipo}` : "/cruces_csv";
        const a = document.createElement("a");
        a.href = url;
        a.download = "cruces_backend.csv";
        a.click();
    });
}
// --- Resumen visual de señales ejecutadas (contador) ---
let contadorCompra = parseInt(localStorage.getItem("contadorCompra")) || 0;
let contadorVenta = parseInt(localStorage.getItem("contadorVenta")) || 0;
actualizarResumen();

// Observa cambios en el input de color y actualiza anotaciones existentes
["colorCompra", "colorVenta"].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
        input.addEventListener("input", actualizarColoresAnotaciones);
    }
});


const LiveChartController = {
    onMessageHandler,
    reiniciarStream,
    handleCambioSimbolo,
    cargarHistoricoInicial,
    chart,
    SELECTOR_SYMBOL,
    SELECTOR_INTERVAL
};

export default LiveChartController;

function esSimboloValido(symbol) {
    return SYMBOLS_VALIDOS.includes(symbol);
}

function esIntervaloValido(interval) {
    return INTERVALOS_VALIDOS.includes(interval);
}

// const modoDebug = false;
// if (modoDebug) {
//     activarModoDebug(chart, "BTCUSDT", "1m", onMessageHandler);
// }

// Cierra todos los WebSockets abiertos al salir de la página
window.addEventListener("beforeunload", () => {
    cerrarTodosLosSockets();
});
