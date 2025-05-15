// chart_manager.js
import { createCandlestickChart, createVolumeChart, updateVolumeChart, updateChartTitle } from './grafico_utils.js';
import { calculateSMA, getSMADataset } from './indicadores.js';

export class ChartManager {
  constructor(ctx, volumeCtx, initialSymbol = 'BTCUSDT', initialInterval = '1h') {
    this.chart = createCandlestickChart(ctx, initialSymbol);
    this.volumeChart = createVolumeChart(volumeCtx);
    // Asegura que datasets[0] esté inicializado para el gráfico de volumen
    if (!this.volumeChart.data.datasets[0]) {
      this.volumeChart.data.datasets[0] = { label: 'Volumen', data: [] };
    }
    this.symbol = initialSymbol;
    this.interval = initialInterval;
    this.activeSMAs = [];
  }

  setSymbol(symbol) {
    this.symbol = symbol;
    updateChartTitle(this.symbol, this.interval);
  }

  setInterval(interval) {
    this.interval = interval;
    updateChartTitle(this.symbol, this.interval);
  }

  loadData(candles) {
    if (!this.chart.data.datasets[0]){
      this.chart.data.datasets[0] = {
        label: this.symbol,
        data: candles
      };
    } else {
      this.chart.data.datasets[0].data = candles;
    }
    if (this.volumeChart && this.volumeChart.data && this.volumeChart.data.datasets) {
      updateVolumeChart(this.volumeChart, candles);
    }
    this.chart.update();
  }

  updateWithLiveCandle(candle) {
    const data = this.chart.data.datasets[0].data;
    const last = data[data.length - 1];

    if (last && last.x === candle.x) {
      Object.assign(last, candle);
    } else {
      data.push(candle);
      if (data.length > 150) data.shift();
    }

    if (this.volumeChart && this.volumeChart.data && this.volumeChart.data.datasets) {
      updateVolumeChart(this.volumeChart, data);
    }
    this.chart.update();
  }

  addSMASeries(data, period) {
    const label = `SMA ${period}`;
    const existing = this.chart.data.datasets.find(ds => ds.label === label);
    if (!existing) {
      const index = this.chart.data.datasets.length;
      const smaDataset = getSMADataset(period, data, index);
      this.chart.data.datasets.push(smaDataset);
      this.chart.update();
    }
  }

  getUltimosPrecios() {
    return this.chart.data.datasets[0].data.map(c => c.y || c.close);
  }

  getSMAForPeriod(period) {
    const smaDataset = this.chart.data.datasets.find(ds =>
      ds.label && ds.label.toUpperCase() === `SMA ${period}`
    );
    if (!smaDataset) return [];
    return smaDataset.data.map(d => d.y);
  }

  anotarSeñal(señal) {
    if (!this.chart.options.plugins.annotation) {
      this.chart.options.plugins.annotation = { annotations: [] };
    }
    const color = señal.tipo === 'compra' ? 'green' : 'red';
    this.chart.options.plugins.annotation.annotations.push({
      type: 'line',
      mode: 'vertical',
      scaleID: 'x',
      value: señal.timestamp,
      borderColor: color,
      borderWidth: 2,
      label: {
        content: señal.tipo.toUpperCase(),
        enabled: true,
        position: 'start'
      }
    });
    this.chart.update();
  }

  resetChart() {
    // Limpia datos del gráfico de velas
    if (this.chart) {
      this.chart.data.labels = [];
      this.chart.data.datasets = [];
      this.chart.update();
    }

    // Limpia datos del gráfico de volumen
    if (this.volumeChart) {
      this.volumeChart.data.labels = [];
      this.volumeChart.data.datasets = [{
        label: 'Volumen',
        data: [],
        backgroundColor: '#888'
      }];
      this.volumeChart.update();
    }

    // Limpia SMA activas (si aplica)
    this.activeSMAs = [];
  }
}