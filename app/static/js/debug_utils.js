


function activarModoDebug(chart, symbol, interval, procesarKline) {
    console.log("🧪 Modo DEBUG activo: generando datos simulados cada 10s");

    setInterval(() => {
        const ahora = Date.now();
        const simulatedKline = {
            s: symbol,
            i: interval,
            k: {
                t: ahora,
                T: ahora + 60000,
                s: symbol,
                i: interval,
                o: "50000.0",
                c: (50000 + Math.random() * 1000).toFixed(2),
                h: "51000.0",
                l: "49000.0",
                v: (Math.random() * 5).toFixed(2),
                n: 10,
                x: true,
                q: "0",
                V: "0",
                Q: "0",
                B: "0"
            }
        };
        procesarKline(simulatedKline);
    }, 10000);
}

export { activarModoDebug };