// === estrategias.js ===

/**
 * Crea una estrategia de señales basada en comparación con indicadores
 * @param {Object} config - Configuración de la estrategia
 * @param {string} config.tipo - Tipo de indicador ('SMA', 'EMA', etc.)
 * @param {number} config.periodo - Periodo del indicador a evaluar
 * @param {string} [config.modo='precio-vs-sma'] - Modo de comparación
 * @returns {Function} - Función evaluadora: (candle) => señal | null
 */
function estrategiaFactory(chartManager, config = {}) {
  const { tipo = 'SMA', periodo = 20, modo = 'precio-vs-sma' } = config;

  return function evaluar(candle) {
    if (!chartManager || !chartManager.getUltimosPrecios || !chartManager.getSMAForPeriod) {
      console.warn("❌ ChartManager incompleto o no preparado");
      return null;
    }

    const precios = chartManager.getUltimosPrecios();
    const sma = chartManager.getSMAForPeriod(periodo);

    const i = precios.length - 1;
    if (i < 1 || sma.length < 2) return null;

    const precioActual = precios[i];
    const precioAnterior = precios[i - 1];
    const smaActual = sma[i];
    const smaAnterior = sma[i - 1];

    if ([precioActual, precioAnterior, smaActual, smaAnterior].some(v => v == null)) return null;

    if (modo === 'precio-vs-sma') {
      if (precioAnterior < smaAnterior && precioActual > smaActual) {
        return {
          tipo: 'compra',
          timestamp: candle.time,
          precio: precioActual,
          indicador: smaActual,
          periodo,
          metodo: tipo
        };
      } else if (precioAnterior > smaAnterior && precioActual < smaActual) {
        return {
          tipo: 'venta',
          timestamp: candle.time,
          precio: precioActual,
          indicador: smaActual,
          periodo,
          metodo: tipo
        };
      }
    }

    // Puedes añadir más modos aquí (ej: cruce de dos SMAs)

    return null;
  };
}

export { estrategiaFactory };