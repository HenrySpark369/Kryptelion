// === grafico_utils.js ===
export function createCandlestickChart(ctx, symbol) {
  return new Chart(ctx, {
    type: 'candlestick',
    data: {
      datasets: [{
        label: symbol,
        data: [],
        color: { up: '#26a69a', down: '#ef5350', unchanged: '#999' }
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#e0e0e0' } } },
      scales: {
        x: {
          type: 'time',
          time: {
            tooltipFormat: 'MMM dd yyyy HH:mm',
            displayFormats: {
              minute: 'HH:mm', hour: 'MMM dd HH:mm', day: 'MMM dd', week: 'MMM dd', month: 'MMM yyyy'
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
}

export function createVolumeChart(ctx) {
  return new Chart(ctx, {
    type: 'bar',
    data: {
      datasets: [{
        label: 'Volumen',
        data: [],
        backgroundColor: '#888'
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
      plugins: { legend: { display: false } }
    }
  });
}

export function updateVolumeChart(volumeChart, candles) {
  if (!volumeChart || !volumeChart.data || !volumeChart.data.datasets || !volumeChart.data.datasets[0]) {
    console.warn("volumeChart no está correctamente inicializado:", volumeChart);
    return;
  }
  volumeChart.data.datasets[0].data = candles.map(c => ({
    x: c.x,
    y: c.v
  }));
  volumeChart.update();
}

export function updateChartTitle(symbol, interval) {
  const displayName = symbol.replace("USDT", "/USDT");
  document.getElementById("chartTitle").textContent = `${displayName} - ${interval} en Vivo - Tipo TradingView`;
}
