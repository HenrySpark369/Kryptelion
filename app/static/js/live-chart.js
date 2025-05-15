// === live-chart-hibrido.js ===
import { calculateSMA, getSMADataset, actualizarSMA } from './indicadores.js';
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

  const limit = 200;
  const extra = 200;
  const allCandles = await fetchHistoricalCandles(symbol, interval, limit, extra);

  // Calcular SMAs con todas las velas
  const activeSMAs = loadSavedSMAs();
  const allSMASeries = activeSMAs.map(period => ({
    period,
    data: calculateSMA(allCandles, period)
  }));

  // Recortar datos visibles
  const visibleCandles = allCandles.slice(-limit);

  // Recortar también cada SMA
  const visibleSMASeries = allSMASeries.map(serie => ({
    period: serie.period,
    data: serie.data.slice(-limit)
  }));

  chartManager.setSymbol(symbol);
  chartManager.setInterval(interval);
  chartManager.loadData(visibleCandles);

  // Aplicar SMA recortadas
  visibleSMASeries.forEach(serie => {
    chartManager.addSMASeries(serie.data, serie.period);
  });

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
      const baseData = chartManager.chart.data.datasets[0].data;
      const smas = chartManager.activeSMAs.map((period, index) => {
        const data = calculateSMA(baseData, period);
        return getSMADataset(period, data, index);
      });

      // Eliminar datasets de SMA existentes
      chartManager.chart.data.datasets = chartManager.chart.data.datasets.filter((ds, i) => i === 0);

      // Agregar los nuevos datasets de SMA
      smas.forEach(smaDataset => {
        chartManager.chart.data.datasets.push(smaDataset);
      });

      chartManager.chart.update();
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
      if (!chartManager.activeSMAs.includes(period)) {
        chartManager.activeSMAs.push(period);
        const data = calculateSMA(chartManager.chart.data.datasets[0].data, period);
        chartManager.addSMASeries(data, period);
        saveSMAs(chartManager.activeSMAs);
      }
    },
    onRemove: (period) => {
      chartManager.activeSMAs = chartManager.activeSMAs.filter(p => p !== period);
      chartManager.chart.data.datasets = chartManager.chart.data.datasets.filter(ds => ds.label !== `SMA ${period}`);
      chartManager.chart.update();
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