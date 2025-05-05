import pytest
from estrategias.factory import auto_registrar, get_estrategia
from indicadores.medias_moviles import calcular_sma
import joblib
import os
import pandas as pd

class DummyModelo:
    def predict(self, X):
        return ["BUY"] * len(X)

@pytest.fixture(scope="module", autouse=True)
def registrar_estrategias():
    auto_registrar()

@pytest.fixture
def dummy_modelo(tmp_path):
    modelo_path = tmp_path / "modelo_ml.pkl"
    joblib.dump(DummyModelo(), modelo_path)
    return str(modelo_path)

@pytest.mark.parametrize("sma_corta,sma_larga", [(9, 21), (5, 15)])
def test_sma_cruce_evalua_correctamente(sma_corta, sma_larga):
    config = {"sma_corta": sma_corta, "sma_larga": sma_larga}
    estrategia = get_estrategia("sma_cruce", config)

    datos = [{"close": c} for c in range(100, 121)]
    cierres_df = pd.DataFrame(datos)
    sma_fast = calcular_sma(cierres_df, sma_corta).iloc[-1]
    sma_slow = calcular_sma(cierres_df, sma_larga).iloc[-1]

    resultado = estrategia.evaluar({"sma_fast": sma_fast, "sma_slow": sma_slow})
    assert resultado in ["comprar", "vender", "mantener"]

def test_ml_predictor_evalua_correctamente(dummy_modelo):
    config = {"modelo_path": dummy_modelo}
    estrategia = get_estrategia("ml", config)

    df = pd.DataFrame([
        {"close": 100, "sma_fast": 105, "sma_slow": 110},
        {"close": 101, "sma_fast": 106, "sma_slow": 109},
    ])
    resultado = estrategia.evaluar(df.to_dict(orient="records"))
    assert all(r == "BUY" for r in resultado)