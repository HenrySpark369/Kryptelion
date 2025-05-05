import joblib
import numpy as np
import pandas as pd
from estrategias.factory import registrar

class MLPredictor:
    def __init__(self, config=None):
        self.config = config or {}
        ruta_modelo = self.config.get("ruta_modelo", "modelos/modelo_ml.pkl")
        columnas = self.config.get("columnas", ["sma_fast", "sma_slow"])
        self.columnas = columnas
        self.modelo = joblib.load(ruta_modelo)

    def analizar(self, df: pd.DataFrame):
        try:
            if not all(col in df.columns for col in self.columnas):
                return []
            entrada = df[self.columnas].values
            predicciones = self.modelo.predict(entrada)
            resultados = []
            for pred in predicciones:
                if pred == 1:
                    resultados.append({"signal": "buy"})
                elif pred == -1:
                    resultados.append({"signal": "sell"})
            return resultados
        except Exception as e:
            print(f"Error en predicción ML: {e}")
            return []

registrar("ml", MLPredictor)