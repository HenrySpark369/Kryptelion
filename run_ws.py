from wsbridge.servidor_ws import iniciar_servidor_ws
import asyncio

if __name__ == "__main__":
    print("[MAIN] Iniciando microservicio WebSocket...")
    asyncio.run(iniciar_servidor_ws())
