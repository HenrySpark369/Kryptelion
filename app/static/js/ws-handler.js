// ws-manager.js
// 📡 Manejador de múltiples WebSockets para diferentes símbolos e intervalos
const sonidoConectado = new Audio('./static/sounds/connected.mp3');
const sonidoReintentando = new Audio('./static/sounds/reconnecting.mp3');
const sonidoError = new Audio('./static/sounds/error.mp3');
const sonidoFallido = new Audio('./static/sounds/failed.mp3');

let usuarioActivo = false;
document.addEventListener("click", () => usuarioActivo = true, { once: true });

const WS_URL = "ws://localhost:8765"; // Ajusta esta URL según tu servidor WebSocket
const sockets = {}; // Objeto para almacenar sockets por clave symbol_interval

// 🔑 Crea una clave única basada en símbolo e intervalo
function crearKey(symbol, interval) {
    return `${symbol}_${interval}`;
}

// 🚀 Conecta un nuevo WebSocket (o reusa uno existente) para un símbolo/intervalo
function conectarWebSocket(symbol, interval, onMessageHandler, onStatusChange = () => {}) {
    const key = crearKey(symbol, interval);
    const MAX_REINTENTOS = 5;
    const BASE_DELAY = 2000;
    let intentos = 0;

    function intentarConexion() {
        if (sockets[key] && sockets[key].readyState !== WebSocket.CLOSED) {
            console.warn(`⚠️ Socket ya abierto para ${key}`);
            return sockets[key];
        }

        const socket = new WebSocket(`${WS_URL}?symbol=${symbol}&interval=${interval}`);
        sockets[key] = socket;

        onStatusChange('connecting');

        socket.onopen = () => {
            if (usuarioActivo) {
                sonidoConectado.play().catch(e => console.warn("🔈 No se pudo reproducir sonido:", e));
            }
            console.log(`🟢 Conectado WebSocket para ${key}`);
            intentos = 0;
            onStatusChange('connected');
        };

        socket.onmessage = (event) => {
            console.log("📊 Datos recibidos del WebSocket:", event.data);
            if (typeof onMessageHandler === "function") {
                onMessageHandler(event);
            } else {
                console.warn("⚠️ onMessageHandler no es una función:", onMessageHandler);
            }
        };

        socket.onerror = err => {
            sonidoError.play();
            console.error(`❌ Error en ${key}:`, err);
            onStatusChange('error');
        };

        socket.onclose = () => {
            if (intentos < MAX_REINTENTOS) {
                const delay = BASE_DELAY * Math.pow(2, intentos);
                console.warn(`🔌 Socket ${key} cerrado. Reintentando en ${delay / 1000}s...`);
                intentos += 1;
                sonidoReintentando.play();
                onStatusChange('reconnecting');
                setTimeout(() => intentarConexion(), delay);
            } else {
                console.error(`❌ Se alcanzó el máximo de reintentos para ${key}.`);
                sonidoFallido.play();
                delete sockets[key];
                onStatusChange('failed');
            }
        };
    }

    intentarConexion();
    return sockets[key];
}

// ❌ Cierra y elimina el WebSocket asociado a un símbolo/intervalo
function cerrarWebSocket(symbol, interval) {
    const key = crearKey(symbol, interval);
    if (sockets[key]) {
        sockets[key].close();
        delete sockets[key];
        console.log(`🛑 Socket cerrado manualmente para ${key}`);
    }
}

function cerrarTodosLosSockets() {
    Object.keys(sockets).forEach(key => {
        sockets[key].close();
        delete sockets[key];
        console.log(`🛑 Socket cerrado (cerrarTodosLosSockets) para ${key}`);
    });
}


// 🔄 Reinicia el WebSocket para un símbolo/intervalo centralizando la lógica de reconexión
function reiniciarStream(symbol, interval, onMessageHandler, onStatusChange = () => {}) {
    cerrarWebSocket(symbol, interval);
    conectarWebSocket(symbol, interval, onMessageHandler, onStatusChange);
}

// Exporta las funciones principales
export { conectarWebSocket, cerrarWebSocket, cerrarTodosLosSockets, reiniciarStream };