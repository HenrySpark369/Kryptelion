function resetearDatosChart(chart) {
    if (!chart) return;
    chart.data.labels = [];
    chart.data.datasets.forEach(dataset => dataset.data = []);
    chart.update();
}

function limpiarAnotaciones(chart) {
    if (chart.options.plugins?.annotation?.annotations) {
        chart.options.plugins.annotation.annotations = [];
    }
}

function limpiarTablaOrdenes(tablaOrdenesId) {
    const tabla = document.getElementById(tablaOrdenesId);
    if (tabla && tabla.rows.length > 1) {
        while (tabla.rows.length > 1) {
            tabla.deleteRow(1);
        }
    }
}

function actualizarResumen() {
    const compra = parseInt(localStorage.getItem("contadorCompra") || "0");
    const venta = parseInt(localStorage.getItem("contadorVenta") || "0");
    const resumen = document.getElementById("resumen");
    if (resumen) {
        resumen.innerHTML = `
            <strong>Resumen de Órdenes:</strong><br>
            Compras: ${compra} | Ventas: ${venta}
        `;
    }
}

function registrarOrden(tipo) {
    if (tipo === "compra") {
        const actual = parseInt(localStorage.getItem("contadorCompra") || "0");
        localStorage.setItem("contadorCompra", (actual + 1).toString());
    } else if (tipo === "venta") {
        const actual = parseInt(localStorage.getItem("contadorVenta") || "0");
        localStorage.setItem("contadorVenta", (actual + 1).toString());
    }
    actualizarResumen();
}

function limpiarGrafico({ chart, cruceSignals, actualizarResumen, tablaOrdenesId = "tabla-ordenes" }) {
    resetearDatosChart(chart);
    limpiarAnotaciones(chart);

    cruceSignals.length = 0;
    localStorage.setItem("contadorCompra", "0");
    localStorage.setItem("contadorVenta", "0");

    actualizarResumen?.();
    limpiarTablaOrdenes(tablaOrdenesId);
}


function agregarOrdenAHistorial(orden, tablaOrdenesId = "tabla-ordenes") {
    const tabla = document.getElementById(tablaOrdenesId);
    if (!tabla) return;

    const fila = tabla.insertRow(1);
    const celdaTipo = fila.insertCell(0);
    const celdaPrecio = fila.insertCell(1);
    const celdaTimestamp = fila.insertCell(2);

    celdaTipo.textContent = orden.tipo;
    celdaPrecio.textContent = orden.precio.toFixed(2);
    celdaTimestamp.textContent = new Date(orden.timestamp).toLocaleString();

    // Estilo visual
    fila.style.color = orden.tipo === "compra" ? "limegreen" : "tomato";
}

export { limpiarGrafico, actualizarResumen, registrarOrden, agregarOrdenAHistorial };
