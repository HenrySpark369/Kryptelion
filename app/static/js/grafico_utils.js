function actualizarChart(t, c, v, isClosed) {
    if (!chart) return;

    const lastIndex = chart.data.labels.length - 1;

    if (isClosed || lastIndex < 0 || chart.data.labels[lastIndex].getTime() !== t.getTime()) {
        chart.data.labels.push(t);
        chart.data.datasets[0].data.push({ x: t, y: c });
        chart.data.datasets[1].data.push(v);
    } else {
        chart.data.datasets[0].data[lastIndex] = { x: t, y: c };
        chart.data.datasets[1].data[lastIndex] = v;
    }

    // Limita el tamaño de los datos
    const maxPoints = 100;
    if (chart.data.labels.length > maxPoints) {
        chart.data.labels.shift();
        chart.data.datasets.forEach(dataset => dataset.data.shift());
    }
}

export { actualizarChart };
