

function onMessageHandler(event) {
    const kline = JSON.parse(event.data);
    const t = new Date(kline.t);
    const c = parseFloat(kline.c);
    const v = parseFloat(kline.v);

    if (typeof actualizarChart === "function") {
        actualizarChart(t, c, v, kline.x);
    }

    if (typeof actualizarSMA === "function") {
        actualizarSMA(kline.x);
    }

    if (typeof chart !== "undefined" && chart.update) {
        chart.update();
    }

    if (typeof analizarEstrategiaBackend === "function") {
        analizarEstrategiaBackend();
    }
}

export { onMessageHandler };