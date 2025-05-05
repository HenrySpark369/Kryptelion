# setup_env.py
import os
import shutil

origen = "config/.env.example"
destino = "config/.env"

if not os.path.exists(destino):
    shutil.copy(origen, destino)
    print(f"✔ Archivo '{destino}' creado desde el ejemplo.")
else:
    print(f"ℹ El archivo '{destino}' ya existe. No se modificó.")