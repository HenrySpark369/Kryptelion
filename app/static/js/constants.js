let INTERVALOS = {};
let INTERVALOS_VALIDOS = [];
let INTERVALOS_LABELS = {};

export async function cargarIntervalos() {
  const res = await fetch("/config/intervalos.json");
  INTERVALOS = await res.json();
  INTERVALOS_VALIDOS = Object.keys(INTERVALOS);
  INTERVALOS_LABELS = Object.fromEntries(
    Object.entries(INTERVALOS).map(([key, val]) => [key, val.label])
  );
}

export { INTERVALOS, INTERVALOS_VALIDOS, INTERVALOS_LABELS };