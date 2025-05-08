import { calcularSMA } from './indicadores.js';
import { INTERVALOS_LABELS } from './constants.js';

function crearChart(ctx) {
    const esModoOscuro = localStorage.getItem("modoOscuro") === "true";

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    if (esModoOscuro) {
        gradient.addColorStop(0, 'rgba(0, 168, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 168, 255, 0)');
    } else {
        gradient.addColorStop(0, 'rgba(0, 168, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 168, 255, 0.05)');
    }

    const config = {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Precio',
                    data: [],
                    borderColor: '#00a8ff',
                    backgroundColor: gradient,
                    pointRadius: 0,
                    tension: 0.2,
                    borderWidth: 2,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'Volumen',
                    data: [],
                    type: 'bar',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    yAxisID: 'y1'
                },
                {
                    label: 'SMA 10',
                    data: [],
                    type: 'line',
                    borderColor: 'orange',
                    borderWidth: 1.5,
                    fill: false,
                    pointRadius: 0,
                    yAxisID: 'y'
                }
            ]
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    position: 'left',
                    beginAtZero: false,
                    ticks: {
                        color: esModoOscuro ? '#fff' : '#000'
                    }
                },
                y1: {
                    position: 'right',
                    beginAtZero: true,
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        color: esModoOscuro ? '#fff' : '#000'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: '',
                    color: esModoOscuro ? 'white' : 'black'
                },
                legend: {
                    labels: {
                        color: esModoOscuro ? 'white' : 'black'
                    }
                },
                annotation: {
                    annotations: []
                }
            }
        }
    };

    aplicarEstilosModo({ options: config.options, data: config.data }, esModoOscuro);

    return new Chart(ctx, config);
}

function actualizarChart(chart, candle, isClosed, maxPoints = 100) {
    if (!chart || !candle || !candle.x) return;

    const labels = chart.data.labels;
    const precios = chart.data.datasets[0].data;
    const volumenes = chart.data.datasets[1].data;

    const lastIndex = labels.length - 1;

    if (
        isClosed ||
        lastIndex < 0 ||
        labels[lastIndex].getTime() !== candle.x.getTime()
    ) {
        labels.push(candle.x);
        precios.push({ x: candle.x, y: candle.c });
        volumenes.push(candle.v);
    } else {
        precios[lastIndex] = { x: candle.x, y: candle.c };
        volumenes[lastIndex] = candle.v;
    }

    if (labels.length > maxPoints) {
        labels.shift();
        precios.shift();
        volumenes.shift();
    }

    chart.update();
}


function actualizarGraficoHistorico(chart, klines, symbol, interval, smaWindow = 10) {
    const labels = [];
    const precios = [];
    const volumenes = [];

    klines.forEach((k) => {
        if (!k.t || !k.c || !k.v) return;
        const t = new Date(k.t);
        const c = parseFloat(k.c);
        const v = parseFloat(k.v);
        labels.push(t);
        precios.push({ x: t, y: c });
        volumenes.push(v);
    });

    const smaData = calcularSMA(precios.map(p => p.y), smaWindow);

    chart.data.labels = labels;
    chart.data.datasets[0].data = precios;
    chart.data.datasets[1].data = volumenes;
    chart.data.datasets[2].data = smaData;

    const intervaloLegible = INTERVALOS_LABELS[interval] || interval;
    chart.options.plugins.title.text = `Histórico de Precios - ${symbol} (${intervaloLegible})`;

    const esModoOscuro = localStorage.getItem("modoOscuro") === "true";
    aplicarEstilosModo(chart, esModoOscuro);
    chart.update();
}

function aplicarEstilosModo(chart, esModoOscuro) {
    if (chart.options.scales.y?.ticks) {
        chart.options.scales.y.ticks.color = esModoOscuro ? "#fff" : "#000";
    }
    if (chart.options.scales.y1?.ticks) {
        chart.options.scales.y1.ticks.color = esModoOscuro ? "#fff" : "#000";
    }
    if (chart.options.scales.x?.ticks) {
        chart.options.scales.x.ticks.color = esModoOscuro ? "#fff" : "#000";
    }
    if (chart.options.plugins.title) {
        chart.options.plugins.title.color = esModoOscuro ? "white" : "black";
    }
    if (chart.options.plugins.legend?.labels) {
        chart.options.plugins.legend.labels.color = esModoOscuro ? "white" : "black";
    }
    if (chart.data.datasets[1]) {
        chart.data.datasets[1].backgroundColor = esModoOscuro ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
    }
}

export { crearChart, actualizarChart, actualizarGraficoHistorico, aplicarEstilosModo };
