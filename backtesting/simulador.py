from estrategias.factory import get_estrategia
import pandas as pd

def simular(df: pd.DataFrame, estrategia_nombre: str, config: dict = None, capital_inicial: float = 1000.0):
    estrategia = get_estrategia(estrategia_nombre, config)
    señales = estrategia.analizar(df)

    # Convertimos las señales a un dict para acceso rápido por timestamp
    mapa_señales = {s["timestamp"]: s["signal"] for s in señales if "timestamp" in s}

    capital = capital_inicial
    posicion = None
    operaciones = []
    equity = []

    for _, row in df.iterrows():
        precio = row["close"]
        timestamp = row["open_time"]
        señal = mapa_señales.get(timestamp, "none")

        if señal == "buy" and posicion is None:
            posicion = {
                "tipo": "long",
                "entrada": precio,
                "timestamp_entrada": timestamp
            }

        elif señal == "sell" and posicion:
            ganancia = (precio - posicion["entrada"]) / posicion["entrada"]
            capital *= (1 + ganancia)
            operaciones.append({
                "entrada": posicion["entrada"],
                "salida": precio,
                "retorno_pct": ganancia * 100,
                "timestamp_entrada": posicion["timestamp_entrada"],
                "timestamp_salida": timestamp
            })
            posicion = None

        equity.append({
            "timestamp": timestamp,
            "capital": capital
        })

    return operaciones, capital, pd.DataFrame(equity)