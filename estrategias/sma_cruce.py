# sma_cruce.py

# sma_cruce.py

import pandas as pd
from estrategias.factory import registrar

class EstrategiaSMACruce:
    def __init__(self, window=10):
        self.window = window

    def analizar(self, df: pd.DataFrame):
        if len(df) < self.window + 1 or "close" not in df.columns:
            return []

        df = df.copy()
        df["sma"] = df["close"].rolling(self.window).mean()

        prev = df.iloc[-2]
        curr = df.iloc[-1]

        señales = []
        if pd.notna(prev["sma"]) and pd.notna(curr["sma"]):
            if prev["close"] < prev["sma"] and curr["close"] > curr["sma"]:
                señales.append({
                    "signal": "buy",
                    "timestamp": curr.name,
                    "close": curr["close"],
                    "sma": curr["sma"]
                })
            elif prev["close"] > prev["sma"] and curr["close"] < curr["sma"]:
                señales.append({
                    "signal": "sell",
                    "timestamp": curr.name,
                    "close": curr["close"],
                    "sma": curr["sma"]
                })

        return señales

registrar("sma_cruce", EstrategiaSMACruce)