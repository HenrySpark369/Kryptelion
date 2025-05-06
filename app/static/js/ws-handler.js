

const WS_URL = "ws://localhost:6789"; // Ajusta según tu servidor

function conectarWebSocket(onMessageHandler) {
    const socket = new WebSocket(WS_URL);

    socket.onopen = () => console.log("✅ WebSocket conectado desde ws-handler");
    socket.onmessage = onMessageHandler;
    socket.onerror = err => console.error("❌ WebSocket error:", err);
    socket.onclose = () => {
        console.warn("🔌 WebSocket cerrado. Reintentando en 5 segundos...");
        setTimeout(() => conectarWebSocket(onMessageHandler), 5000);
    };
}

export { conectarWebSocket };