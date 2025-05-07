function calcularSMA(datos, periodo) {
    const sma = [];
    for (let i = 0; i < datos.length; i++) {
        if (i >= periodo - 1) {
            const slice = datos.slice(i - periodo + 1, i + 1);
            const avg = slice.reduce((a, b) => a + b, 0) / periodo;
            sma.push(avg);
        } else {
            sma.push(null);
        }
    }
    return sma;
}

function actualizarSMA(chart, periodo, color = "orange", label = `SMA ${periodo}`) {
    if (!chart || !chart.data || !chart.data.labels) return;

    const precios = chart.data.datasets[0].data.map(d => d.y ?? d);
    const smaValores = calcularSMA(precios, periodo);
    const smaData = smaValores.map((y, i) => ({ x: chart.data.labels[i], y }));

    const existingIndex = chart.data.datasets.findIndex(ds => ds.label === label);
    if (existingIndex !== -1) {
        chart.data.datasets[existingIndex].data = smaData;
        chart.data.datasets[existingIndex].borderColor = color;
    } else {
        chart.data.datasets.push({
            label,
            data: smaData,
            borderColor: color,
            fill: false,
            borderWidth: 1.5,
            pointRadius: 0,
            type: 'line'
        });
    }

    chart.update();
}

export { actualizarSMA, calcularSMA };
