function actualizarSMA() {
    if (!chart) return;

    const smaLength = parseInt(document.getElementById("smaLength").value);
    const prices = chart.data.datasets[0].data.map(d => d.y);
    const smaData = [];

    for (let i = 0; i < prices.length; i++) {
        if (i >= smaLength - 1) {
            const slice = prices.slice(i - smaLength + 1, i + 1);
            const avg = slice.reduce((a, b) => a + b, 0) / smaLength;
            smaData.push({ x: chart.data.labels[i], y: avg });
        } else {
            smaData.push({ x: chart.data.labels[i], y: null });
        }
    }

    if (chart.data.datasets.length < 3) {
        chart.data.datasets.push({ label: "SMA", data: smaData, borderColor: "orange", fill: false });
    } else {
        chart.data.datasets[2].data = smaData;
    }
}

export { actualizarSMA };
