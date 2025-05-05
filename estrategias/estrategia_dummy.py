import pandas as pd
from estrategias.factory import registrar

class EstrategiaDummy:
    def __init__(self, config=None):
        self.config = config or {}

    def analizar(self, df: pd.DataFrame):
        señales = []
        for i in range(1, len(df)):
            if df["close"].iloc[i] > df["close"].iloc[i - 1]:
                señales.append({
                    "timestamp": df["open_time"].iloc[i],
                    "signal": "buy"
                })
            elif df["close"].iloc[i] < df["close"].iloc[i - 1]:
                señales.append({
                    "timestamp": df["open_time"].iloc[i],
                    "signal": "sell"
                })
        return señales

registrar("dummy", EstrategiaDummy)