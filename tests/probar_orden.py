import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import json
from datetime import datetime

# Crear carpeta de logs si no existe
os.makedirs("logs", exist_ok=True)

def registrar_en_log(nombre, datos):
    with open(f"logs/ordenes.log", "a") as f:
        entrada = {
            "timestamp": datetime.utcnow().isoformat(),
            "tipo": nombre,
            "datos": datos
        }
        f.write(json.dumps(entrada) + "\n")

from core.ordenes import enviar_orden_market, enviar_orden_inversa
from config import settings

if __name__ == "__main__":
    print(f"Enviando orden inicial en entorno: {settings.MODO.upper()}")
    orden = enviar_orden_market("ETHUSDT", "BUY", 0.05)
    print("Orden enviada:")
    print(orden)
    registrar_en_log("orden_inicial", orden)

    if "orderId" in orden:
        print("\nEnviando orden inversa para cerrar la posición...")
        orden_inversa = enviar_orden_inversa(orden)
        print("Orden inversa:")
        print(orden_inversa)
        registrar_en_log("orden_inversa", orden_inversa)
    else:
        print("\nNo se pudo enviar la orden inversa porque la orden original falló.")