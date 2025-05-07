function analizarEstrategiaBackendFactory(chart) {
    return function () {
        if (!chart || chart.data.datasets.length < 3) return null;

        const precios = chart.data.datasets[0].data;
        const sma = chart.data.datasets[2].data;

        const i = precios.length - 1;
        if (i < 1) return null;

        const precioActual = precios[i]?.y;
        const smaActual = sma[i]?.y;
        const smaAnterior = sma[i - 1]?.y;
        const precioAnterior = precios[i - 1]?.y;

        if (
            precioActual == null || smaActual == null ||
            precioAnterior == null || smaAnterior == null
        ) return null;

        if (precioAnterior < smaAnterior && precioActual > smaActual) {
            console.log("🔼 Señal de compra detectada");
            return {
                tipo: "compra",
                timestamp: Date.now(),
                precio: precioActual,
                sma: smaActual
            };
        } else if (precioAnterior > smaAnterior && precioActual < smaActual) {
            console.log("🔽 Señal de venta detectada");
            return {
                tipo: "venta",
                timestamp: Date.now(),
                precio: precioActual,
                sma: smaActual
            };
        }

        return null;
    };
}

export { analizarEstrategiaBackendFactory };