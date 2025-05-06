

function analizarEstrategiaBackend() {
    if (!chart || chart.data.datasets.length < 3) return;

    const precios = chart.data.datasets[0].data;
    const sma = chart.data.datasets[2].data;

    const i = precios.length - 1;
    if (i < 1) return;

    const precioActual = precios[i].y;
    const smaActual = sma[i].y;
    const smaAnterior = sma[i - 1]?.y;
    const precioAnterior = precios[i - 1]?.y;

    if (smaAnterior && smaActual) {
        if (precioAnterior < smaAnterior && precioActual > smaActual) {
            console.log("🔼 Señal de compra detectada");
        } else if (precioAnterior > smaAnterior && precioActual < smaActual) {
            console.log("🔽 Señal de venta detectada");
        }
    }
}

export { analizarEstrategiaBackend };