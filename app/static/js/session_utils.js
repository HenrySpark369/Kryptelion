// === session_utils.js ===

export function loadSavedSMAs() {
  const saved = JSON.parse(localStorage.getItem('activeSMAs'));
  return Array.isArray(saved) ? saved : [];
}

export function saveSMAs(activeSMAs) {
  localStorage.setItem('activeSMAs', JSON.stringify(activeSMAs));
}

export function actualizarResumen() {
  const contadorCompra = parseInt(localStorage.getItem("contadorCompra")) || 0;
  const contadorVenta = parseInt(localStorage.getItem("contadorVenta")) || 0;

  const elCompra = document.getElementById("contadorCompra");
  const elVenta = document.getElementById("contadorVenta");

  if (elCompra) elCompra.textContent = contadorCompra;
  if (elVenta) elVenta.textContent = contadorVenta;
}
