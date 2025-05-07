


export async function obtenerDatosHistoricos(symbol, interval, dias = 3) {
    try {
        const now = Date.now();
        const startTime = now - dias * 24 * 60 * 60 * 1000;
        const endTime = now;

        const url = `/historico?symbol=${symbol}&interval=${interval}&limit=100&startTime=${startTime}&endTime=${endTime}`;
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`Error en la solicitud: ${res.statusText}`);
        }

        const data = await res.json();
        return data.klines || [];
    } catch (error) {
        console.error("Error al obtener datos históricos:", error);
        return [];
    }
}