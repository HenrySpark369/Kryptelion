


function exportarJSON(data, filename = 'export.json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportarCSV(data, filename = 'export.csv') {
    if (!data || data.length === 0) return;

    const encabezados = Object.keys(data[0]).join(',');
    const filas = data.map(obj =>
        Object.values(obj).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
    );
    const contenido = [encabezados, ...filas].join('\n');

    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function exportarABackend(data, endpoint = '/exportar') {
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        const resultado = await res.json();
        console.log("✅ Exportación al backend exitosa:", resultado);
    } catch (error) {
        console.error("❌ Error exportando al backend:", error);
    }
}

export { exportarJSON, exportarCSV, exportarABackend };