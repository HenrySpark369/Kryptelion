// === live-chart-hibrido.js ===
import { calculateSMA, reapplySMAs, actualizarSMA } from './indicadores.js';
import { fetchHistoricalCandles } from './data_loader.js';
import { reiniciarStream, cerrarTodosLosSockets } from './ws-handler.js';
import { loadSavedSMAs, saveSMAs, actualizarResumen } from './session_utils.js';
import {
  bindSymbolSelector, bindIntervalSelector, bindSmaControls,
  populateIntervalSelector, actualizarColoresAnotaciones,
  bindExportButtons, bindModoOscuro, bindColorInputs
} from './ui_utils.js';

import { ChartManager } from './chart_manager.js';

import { estrategiaFactory } from './estrategias.js';

import { onMessageHandlerFactory } from './procesador_kline.js';

let chartManager;
let cruceSignals = [];

async function initializeChart(symbol, interval) {
  cerrarTodosLosSockets();
  chartManager.resetChart();
  
  const candles = await fetchHistoricalCandles(symbol, interval);
  chartManager.setSymbol(symbol);
  chartManager.setInterval(interval);
  chartManager.loadData(candles);
  chartManager.setSMAs(loadSavedSMAs());
  startLiveStream(symbol, interval);
}

function startLiveStream(symbol, interval) {
  const evaluarEstrategia = estrategiaFactory(chartManager, {
    tipo: 'SMA',
    periodo: chartManager.activeSMAs[0] || 20,
    modo: 'precio-vs-sma'
  });

  const onMessageHandler = onMessageHandlerFactory({
    chartManager,
    actualizarChart: (chart, candle, esFinal) => {
      chartManager.updateWithLiveCandle(candle);
    },
    actualizarSMA: () => {
      reapplySMAs(chartManager.chart, chartManager.activeSMAs);
    },
    analizarEstrategiaBackend: () => evaluarEstrategia({ time: Date.now() }) // usa un mock si no hay vela real
  });

  reiniciarStream(symbol, interval, onMessageHandler);
}

document.addEventListener('DOMContentLoaded', async () => {
  await populateIntervalSelector();

  const ctx = document.getElementById('candlestickChart')?.getContext('2d');
  const volumeCtx = document.getElementById('volumeChart')?.getContext('2d');
  if (!ctx || !volumeCtx) return console.error("❌ Canvases no encontrados.");

  const currentSymbol = localStorage.getItem('symbol') || 'BTCUSDT';
  const currentInterval = localStorage.getItem('interval') || '15m';
  chartManager = new ChartManager(ctx, volumeCtx, currentSymbol, currentInterval);
  chartManager.setSMAs(loadSavedSMAs());

  // Vincular controles UI
  bindSymbolSelector((symbol) => {
    localStorage.setItem('symbol', symbol);
    initializeChart(symbol, chartManager.interval);
  });

  bindIntervalSelector((interval) => {
    localStorage.setItem('interval', interval);
    initializeChart(chartManager.symbol, interval);
  });

  bindSmaControls({
    onAdd: (period) => {
      chartManager.addSMA(period);
      saveSMAs(chartManager.activeSMAs);
    },
    onRemove: (period) => {
      chartManager.removeSMA(period);
      saveSMAs(chartManager.activeSMAs);
    }
  });

  bindExportButtons(cruceSignals);
  bindModoOscuro();
  bindColorInputs(actualizarColoresAnotaciones);

  cerrarTodosLosSockets();
  await initializeChart(currentSymbol, currentInterval);
  actualizarResumen();
});

window.addEventListener("beforeunload", () => cerrarTodosLosSockets());