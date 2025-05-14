// === ui_utils.js ===

import { INTERVALOS_LABELS, cargarIntervalos } from './constants.js';

export function bindSymbolSelector(onChange) {
  const select = document.getElementById('symbolSelect');
  if (select) {
    select.addEventListener('change', function () {
      onChange(this.value);
    });
  }
}

export function bindIntervalSelector(onChange) {
  const select = document.getElementById('intervalSelect');
  if (select) {
    select.addEventListener('change', function () {
      onChange(this.value);
    });
  }
}

export function bindSmaControls({ onAdd, onRemove }) {
  const addBtn = document.getElementById('addSmaBtn');
  const removeBtn = document.getElementById('removeSmaBtn');
  const input = document.getElementById('smaInput');
  const list = document.getElementById('smaList');

  if (addBtn && input) {
    addBtn.addEventListener('click', () => {
      const period = parseInt(input.value);
      if (period > 0) onAdd(period);
    });
  }

  if (removeBtn && list) {
    removeBtn.addEventListener('click', () => {
      const selected = list.value;
      if (!selected) return;
      const period = parseInt(selected.split(' ')[1]);
      onRemove(period);
    });
  }
}

export async function populateIntervalSelector() {
  const select = document.getElementById('intervalSelect');
  if (!select) return;

  await cargarIntervalos();

  select.innerHTML = ''; // Limpiar previo
  Object.entries(INTERVALOS_LABELS).forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.text = label;
    select.appendChild(option);
  });
}

export function bindExportButtons(cruceSignals) {
  document.getElementById("exportCruces")?.addEventListener("click", () => {
    exportarJSON(cruceSignals);
  });

  document.getElementById("exportCSV")?.addEventListener("click", () => {
    exportarCSV(cruceSignals);
  });

  document.getElementById("enviarBackend")?.addEventListener("click", () => {
    exportarABackend({ cruces: cruceSignals, tipo: "json" }, "/exportar_cruces");
  });

  document.getElementById("descargarCSVBackend")?.addEventListener("click", () => {
    const tipo = document.getElementById("filtroTipo")?.value;
    const url = tipo ? `/cruces_csv?tipo=${tipo}` : "/cruces_csv";
    const a = document.createElement("a");
    a.href = url;
    a.download = "cruces_backend.csv";
    a.click();
  });
}

export function bindModoOscuro(callback) {
  const toggleOscuroBtn = document.getElementById("toggleModoOscuro");
  if (!toggleOscuroBtn) return;
  toggleOscuroBtn.addEventListener("click", () => {
    const esModoOscuro = document.body.classList.toggle("modo-oscuro");
    localStorage.setItem("modoOscuro", esModoOscuro);
    toggleOscuroBtn.textContent = esModoOscuro ? "☀️" : "🌙";
    callback?.(esModoOscuro);
  });
  if (localStorage.getItem("modoOscuro") === "true") {
    document.body.classList.add("modo-oscuro");
    toggleOscuroBtn.textContent = "☀️";
    callback?.(true);
  }
}

export function bindColorInputs(handler) {
  ["colorCompra", "colorVenta"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", handler);
  });
}
export function actualizarColoresAnotaciones() {
  const chart = window?.LiveChartController?.chart;
  if (!chart || !chart.options.plugins.annotation) return;

  const colorCompra = document.getElementById("colorCompra")?.value || "green";
  const colorVenta = document.getElementById("colorVenta")?.value || "red";

  const annotations = chart.options.plugins.annotation.annotations;
  annotations.forEach(anotacion => {
    if (anotacion.label?.content === "COMPRA") {
      anotacion.borderColor = colorCompra;
      anotacion.label.backgroundColor = colorCompra;
    }
    if (anotacion.label?.content === "VENTA") {
      anotacion.borderColor = colorVenta;
      anotacion.label.backgroundColor = colorVenta;
    }
  });

  chart.update();
}