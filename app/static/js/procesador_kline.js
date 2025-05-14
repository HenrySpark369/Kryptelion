function onMessageHandlerFactory({ chartManager, actualizarChart, actualizarSMA, analizarEstrategiaBackend }) {
    return function onMessageHandler(event) {
        let kline;
        try {
            kline = JSON.parse(event.data);
        } catch (e) {
            console.error("❌ Error al parsear kline:", e);
            return;
        }

        const { t, o, h, l, c, v, x } = kline;

        if (!t || !o || !h || !l || !c || !v) {
            console.warn("⚠️ Kline incompleto:", kline);
            return;
        }

        const candle = {
            x: new Date(t),
            o: parseFloat(o),
            h: parseFloat(h),
            l: parseFloat(l),
            c: parseFloat(c),
            v: parseFloat(v),
            time: t
        };

        const esVelaCerrada = x === true;

        if (typeof actualizarChart === "function") {
            actualizarChart(chartManager.chart, candle, esVelaCerrada);
        }

        if (esVelaCerrada && typeof actualizarSMA === "function") {
            actualizarSMA();
        }

        if (esVelaCerrada && typeof analizarEstrategiaBackend === "function") {
            const señal = analizarEstrategiaBackend();
            if (señal) {
                chartManager.anotarSeñal(señal);
            }
        }
    };
}

export { onMessageHandlerFactory };