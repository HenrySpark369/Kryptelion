// ws-manager-hibrido.js
const sonidoConectado = new Audio('./static/sounds/connected.mp3');
const sonidoReintentando = new Audio('./static/sounds/reconnecting.mp3');
const sonidoError = new Audio('./static/sounds/error.mp3');
const sonidoFallido = new Audio('./static/sounds/failed.mp3');

let usuarioActivo = false;
document.addEventListener("click", () => usuarioActivo = true, { once: true });

const WS_URL = "ws://localhost:8765";
const sockets = {};
const shouldReconnect = {};

function crearKey(symbol, interval) {
    return `${symbol}_${interval}`;
}

function conectarWebSocket(symbol, interval, onMessageHandler, onStatusChange = () => {}) {
    const key = crearKey(symbol, interval);
    const MAX_REINTENTOS = 5;
    const BASE_DELAY = 2000;
    let intentos = 0;

    function intentarConexion() {
        shouldReconnect[key] = true;
        if (sockets[key]) {
            try {
                sockets[key].close();
            } catch (e) {
                console.warn(`⚠️ No se pudo cerrar socket viejo para ${key}`);
            }
        }

        const socket = new WebSocket(`${WS_URL}?symbol=${symbol}&interval=${interval}`);
        sockets[key] = socket;

        onStatusChange('connecting');

        socket.onopen = () => {
            if (usuarioActivo) {
                sonidoConectado.play().catch(e => console.warn("🔈 Error de sonido:", e));
            }
            console.log(`🟢 Conectado WebSocket para ${key}`);
            intentos = 0;
            onStatusChange('connected');
        };

        socket.onmessage = (event) => {
            if (typeof onMessageHandler === "function") {
                onMessageHandler(event);
            } else {
                console.warn("⚠️ onMessageHandler no es una función:", onMessageHandler);
            }
        };

        socket.onerror = (err) => {
            sonidoError.play();
            console.error(`❌ Error en WebSocket ${key}:`, err);
            onStatusChange('error');
        };

        socket.onclose = () => {
            if (shouldReconnect[key] && intentos < MAX_REINTENTOS) {
                const delay = BASE_DELAY * Math.pow(2, intentos);
                console.warn(`🔌 Socket ${key} cerrado. Reintentando en ${delay / 1000}s...`);
                intentos += 1;
                sonidoReintentando.play();
                onStatusChange('reconnecting');
                setTimeout(() => {
                    if (shouldReconnect[key]) intentarConexion();
                }, delay);
            } else {
                if (!shouldReconnect[key]) {
                    console.warn(`🛑 Reconexión cancelada manualmente para ${key}.`);
                } else {
                    console.error(`❌ Se alcanzó el máximo de reintentos para ${key}.`);
                    sonidoFallido.play();
                }
                delete sockets[key];
                onStatusChange('failed');
            }
        };
    }

    intentarConexion();
    return sockets[key];
}

function cerrarWebSocket(symbol, interval) {
    const key = crearKey(symbol, interval);
    if (sockets[key]) {
        shouldReconnect[key] = false;
        sockets[key].close();
        delete sockets[key];
        console.log(`🛑 Socket cerrado manualmente para ${key}`);
    }
}

function cerrarTodosLosSockets() {
    Object.keys(sockets).forEach(key => {
        shouldReconnect[key] = false;
        sockets[key].close();
        delete sockets[key];
        console.log(`🛑 Socket cerrado (cerrarTodosLosSockets) para ${key}`);
    });
}

function reiniciarStream(symbol, interval, onMessageHandler, onStatusChange = () => {}) {
    cerrarWebSocket(symbol, interval);
    conectarWebSocket(symbol, interval, onMessageHandler, onStatusChange);
}

export {
    conectarWebSocket,
    cerrarWebSocket,
    cerrarTodosLosSockets,
    reiniciarStream
};