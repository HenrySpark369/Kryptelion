// === indicadores.js ===
export const smaColors = [
  '#ff6b6b', '#feca57', '#1dd1a1', '#54a0ff', '#5f27cd',
  '#10ac84', '#ff9ff3', '#48dbfb', '#00d2d3', '#c8d6e5'
];

export const smaColorMap = {
  20: '#ff6b6b',
  50: '#54a0ff',
  100: '#feca57',
  200: '#1dd1a1'
};

export function calculateSMA(data, period) {
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


export function updateLastSmaPoints(chart, activeSMAs) {
  const baseData = chart.data.datasets[0].data;
  const lastCandle = baseData.at(-1);
  if (!lastCandle || !lastCandle.closed) return; // 🔍 omitir si la vela no está cerrada

  activeSMAs.forEach((period, index) => {
    const dataset = chart.data.datasets.find(ds => ds.label === `SMA ${period}`);
    if (!dataset) return;

    const lastX = lastCandle.x;

    if (baseData.length < period) {
      const nuevo = { x: lastX, y: undefined };
      const lastPoint = dataset.data.at(-1);
      if (!lastPoint || lastPoint.x !== lastX) {
        dataset.data.push(nuevo);
      } else {
        dataset.data[dataset.data.length - 1] = nuevo;
      }
    } else {
      const lastSlice = baseData.slice(-period);
      const sum = lastSlice.reduce((acc, d) => acc + d.c, 0);
      const promedio = sum / period;
      const nuevo = { x: lastX, y: promedio };
      const lastPoint = dataset.data.at(-1);
      if (!lastPoint || lastPoint.x !== lastX) {
        dataset.data.push(nuevo);
      } else {
        dataset.data[dataset.data.length - 1] = nuevo;
      }
    }
  });

  chart.update('none');
}

// Agrega la función actualizarSMA al final del archivo si no existe aún

export function actualizarSMA(chart, activeSMAs) {
  if (!chart || !activeSMAs || !Array.isArray(activeSMAs)) {
    console.warn("❌ No se puede actualizar SMA: argumentos inválidos");
    return;
  }
  updateLastSmaPoints(chart, activeSMAs);
}


export function getSMADataset(period, data, index = 0) {
  const label = `SMA ${period}`;
  const color = smaColorMap[period] || smaColors[index % smaColors.length];

  return {
    label,
    data,
    type: 'line',
    borderColor: color,
    borderWidth: 1.5,
    fill: false,
    pointRadius: 0,
    tension: 0.1,
    spanGaps: true
  };
}