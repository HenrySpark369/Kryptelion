

import { connectWebSocket, closeWebSocket } from "./ws-handler.js";

document.addEventListener('DOMContentLoaded', () => {
  const candlestickCanvas = document.getElementById('candlestickChart');
  const volumeCanvas = document.getElementById('volumeChart');

  if (!candlestickCanvas || !volumeCanvas) {
    console.error("❌ No se encontró uno de los canvas en el DOM.");
    return;
  }

  const ctx = candlestickCanvas.getContext('2d');
  const volumeCtx = volumeCanvas.getContext('2d');

  const volumeChart = new Chart(volumeCtx, {
    type: 'bar',
    data: {
      datasets: [{
        label: 'Volumen',
        data: [],
        backgroundColor: (ctx) => {
          const candle = ctx.chart.data.datasets[0].data[ctx.dataIndex];
          return candle && candle.c > candle.o ? '#26a69a' : '#ef5350';
        }
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { type: 'time', display: false },
        y: {
          ticks: { color: '#ccc' },
          grid: { color: '#333' }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });

  let currentSymbol = 'BTCUSDT';
  let currentInterval = '15m';
  let activeSMAs = [];
  let smaColorIndex = 0;

  const smaColors = [
    '#ff6b6b', '#feca57', '#1dd1a1', '#54a0ff', '#5f27cd',
    '#10ac84', '#ff9ff3', '#48dbfb', '#00d2d3', '#c8d6e5'
  ];
  const smaColorMap = {
    20: '#ff6b6b',
    50: '#54a0ff',
    100: '#feca57',
    200: '#1dd1a1'
  };

  const chart = new Chart(ctx, {
    type: 'candlestick',
    data: {
      datasets: [{
        label: currentSymbol,
        data: [],
        color: {
          up: '#26a69a',
          down: '#ef5350',
          unchanged: '#999'
        }
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#e0e0e0' } }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            tooltipFormat: 'MMM dd yyyy HH:mm',
            displayFormats: {
              minute: 'HH:mm',
              hour: 'MMM dd HH:mm',
              day: 'MMM dd',
              week: 'MMM dd',
              month: 'MMM yyyy'
            }
          },
          ticks: { color: '#ccc', maxRotation: 0, autoSkip: true },
          grid: { color: '#333' },
          adapters: { date: { zone: 'UTC' } }
        },
        y: {
          ticks: { color: '#ccc' },
          grid: { color: '#333' }
        }
      }
    }
  });

  async function fetchHistoricalCandles(symbol, interval, limit = 75) {
    const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url);
    const klines = await res.json();

    return klines.map(k => ({
      x: k[0],
      o: parseFloat(k[1]),
      h: parseFloat(k[2]),
      l: parseFloat(k[3]),
      c: parseFloat(k[4]),
      v: parseFloat(k[5])
    }));
  }

  function calculateSMA(data, period) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({ x: data[i].x, y: undefined });
        continue;
      }
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].c;
      }
      result.push({ x: data[i].x, y: sum / period });
    }
    return result;
  }

  function reapplyActiveSMAs() {
    const baseData = chart.data.datasets[0].data;
    const smaList = document.getElementById('smaList');
    smaList.innerHTML = '<option disabled selected>Indicadores activos</option>';

    chart.data.datasets = [chart.data.datasets[0]];

    activeSMAs.forEach(period => {
      const smaData = calculateSMA(baseData, period);
      const label = `SMA ${period}`;
      const color = smaColorMap[period] || smaColors[smaColorIndex++ % smaColors.length];

      chart.data.datasets.push({
        label,
        data: smaData,
        type: 'line',
        borderColor: color,
        borderWidth: 1.5,
        fill: false,
        pointRadius: 0
      });

      const option = document.createElement('option');
      option.value = label;
      option.text = label;
      smaList.appendChild(option);
    });

    chart.update();
  }

  async function initializeChart(symbol, interval) {
    chart.data.datasets = [chart.data.datasets[0]];
    chart.data.datasets[0].data = await fetchHistoricalCandles(symbol, interval);
    chart.data.datasets[0].label = symbol;

    volumeChart.data.datasets[0].data = chart.data.datasets[0].data.map(c => ({
      x: c.x,
      y: c.v
    }));
    volumeChart.update();

    updateChartTitle(symbol, interval);
    chart.update();
    reapplyActiveSMAs();
    startLiveStream(symbol, interval);
  }

  function startLiveStream(symbol, interval) {
    closeWebSocket();

    connectWebSocket(symbol, interval, (candle) => {
      const data = chart.data.datasets[0].data;
      const last = data[data.length - 1];

      if (last && last.x === candle.x) {
        Object.assign(last, candle);
      } else {
        data.push(candle);
        if (data.length > 150) data.shift();
      }

      chart.data.datasets.forEach((ds, i) => {
        if (ds.label.startsWith('SMA ')) {
          const period = parseInt(ds.label.split(' ')[1]);
          chart.data.datasets[i].data = calculateSMA(data, period);
        }
      });

      volumeChart.data.datasets[0].data = data.map(c => ({
        x: c.x,
        y: c.v
      }));

      chart.update();
      volumeChart.update();
    });
  }

  function updateChartTitle(symbol, interval) {
    const displayName = symbol.replace("USDT", "/USDT");
    document.getElementById("chartTitle").textContent =
      `${displayName} - ${interval} en Vivo - Tipo TradingView`;
  }

  // === Eventos ===
  document.getElementById('symbolSelect').addEventListener('change', function () {
    currentSymbol = this.value;
    initializeChart(currentSymbol, currentInterval);
  });

  document.getElementById('intervalSelect').addEventListener('change', function () {
    currentInterval = this.value;
    initializeChart(currentSymbol, currentInterval);
  });

  document.getElementById('addSmaBtn').addEventListener('click', () => {
    const period = parseInt(document.getElementById('smaInput').value);
    if (!period || period <= 0 || activeSMAs.includes(period)) return;

    activeSMAs.push(period);
    localStorage.setItem('activeSMAs', JSON.stringify(activeSMAs));
    reapplyActiveSMAs();
  });

  document.getElementById('removeSmaBtn').addEventListener('click', () => {
    const list = document.getElementById('smaList');
    const selected = list.value;
    if (!selected) return;

    const period = parseInt(selected.split(' ')[1]);
    activeSMAs = activeSMAs.filter(p => p !== period);
    localStorage.setItem('activeSMAs', JSON.stringify(activeSMAs));
    reapplyActiveSMAs();
  });

  // === Estado inicial ===
  const savedSMAs = JSON.parse(localStorage.getItem('activeSMAs'));
  if (Array.isArray(savedSMAs)) activeSMAs = savedSMAs;

  initializeChart(currentSymbol, currentInterval);
});