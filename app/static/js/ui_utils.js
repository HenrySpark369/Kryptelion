function mostrarMensaje(texto) {
    let mensajeDiv = document.getElementById("mensajeCarga");
    if (!mensajeDiv) {
        mensajeDiv = document.createElement("div");
        mensajeDiv.id = "mensajeCarga";
        mensajeDiv.style.position = "fixed";
        mensajeDiv.style.top = "10px";
        mensajeDiv.style.left = "50%";
        mensajeDiv.style.transform = "translateX(-50%)";
        mensajeDiv.style.backgroundColor = "#333";
        mensajeDiv.style.color = "#fff";
        mensajeDiv.style.padding = "8px 16px";
        mensajeDiv.style.borderRadius = "4px";
        mensajeDiv.style.zIndex = "9999";
        document.body.appendChild(mensajeDiv);
    }

    mensajeDiv.textContent = texto;
    mensajeDiv.style.display = "block";

    setTimeout(() => {
        mensajeDiv.style.display = "none";
    }, 3000);
}

function obtenerColorAnotacion(tipo) {
    switch (tipo) {
        case "compra": return "green";
        case "venta": return "red";
        default: return "blue";
    }
}

function actualizarColoresAnotaciones(chart, colorCompra, colorVenta) {
    if (!chart || !chart.options.plugins?.annotation?.annotations) return;

    const anotaciones = chart.options.plugins.annotation.annotations;
    for (const id in anotaciones) {
        if (id.startsWith("compra")) {
            anotaciones[id].borderColor = colorCompra;
            anotaciones[id].label.backgroundColor = colorCompra;
        } else if (id.startsWith("venta")) {
            anotaciones[id].borderColor = colorVenta;
            anotaciones[id].label.backgroundColor = colorVenta;
        }
    }
    chart.update();
}

export { mostrarMensaje, obtenerColorAnotacion, actualizarColoresAnotaciones };