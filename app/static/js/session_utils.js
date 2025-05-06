function limpiarGrafico() {
    if (!chart) return;

    chart.data.labels = [];
    chart.data.datasets.forEach(dataset => {
        dataset.data = [];
    });

    if (chart.options.plugins?.annotation?.annotations) {
        chart.options.plugins.annotation.annotations = [];
    }

    cruceSignals.length = 0;
    contadorCompra = 0;
    contadorVenta = 0;
    localStorage.setItem("contadorCompra", "0");
    localStorage.setItem("contadorVenta", "0");
    actualizarResumen();

    const tabla = document.getElementById("tabla-ordenes");
    if (tabla && tabla.rows.length > 1) {
        while (tabla.rows.length > 1) {
            tabla.deleteRow(1);
        }
    }

    chart.update();
}

export { limpiarGrafico };
