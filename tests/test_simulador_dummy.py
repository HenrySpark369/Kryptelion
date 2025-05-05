import estrategias.estrategia_dummy
import pandas as pd
import pytest
from backtesting.simulador import simular

@pytest.mark.backtest
def test_simulador_dummy():
    # Crear datos sintéticos
    df = pd.DataFrame({
        "open_time": pd.date_range(start="2024-01-01", periods=10, freq="D"),
        "close": [100, 102, 101, 103, 104, 102, 105, 107, 106, 108]
    })

    operaciones, capital_final, equity = simular(df, estrategia_nombre="dummy")

    # Validaciones básicas
    assert isinstance(operaciones, list)
    assert isinstance(capital_final, float)
    assert not equity.empty
    assert "capital" in equity.columns

    # Validar que hubo al menos una operación
    assert len(operaciones) > 0