// === data_loader.js ===

export async function fetchHistoricalCandles(symbol, interval, limit = 200, extra = 200) {
  const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit+extra}`;
  const res = await fetch(url);
  const klines = await res.json();

  return klines.map(k => ({
    x: k[0],
    o: parseFloat(k[1]),
    h: parseFloat(k[2]),
    l: parseFloat(k[3]),
    c: parseFloat(k[4]),
    v: parseFloat(k[5])
  }));
}
