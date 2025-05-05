import { DateTime } from 'luxon';
Chart.register(Chart.DateAdapter, DateTime);

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("backtest-form");
  const capitalFinal = document.getElementById("capital-final");
  const ctx = document.getElementById("equityChart").getContext("2d");

  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: "Equity Curve",
        data: [],
        borderColor: "green",
        fill: false
      }]
    },
    options: {
      responsive: true,
      animation: false,
      scales: {
        x: {
          type: "time",
          time: { unit: "minute", tooltipFormat: 'll HH:mm' }
        },
        y: {
          beginAtZero: false
        }
      }
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    const res = await fetch("/backtest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    capitalFinal.textContent = `Capital final: $${data.capital_final.toFixed(2)}`;

    const labels = data.equity.map(p => new Date(p.timestamp));
    const values = data.equity.map(p => p.capital);

    chart.data.labels = labels;
    chart.data.datasets[0].data = values;
    chart.update();
  });
});