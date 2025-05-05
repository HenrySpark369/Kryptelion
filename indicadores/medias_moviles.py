import pandas as pd

def calcular_sma(df, periodos):
    return df['close'].rolling(window=periodos).mean()

def calcular_ema(df, periodos):
    return df['close'].ewm(span=periodos, adjust=False).mean()


def agregar_smas(df, periodos: list):
    """
    Agrega columnas SMA al DataFrame para cada periodo especificado.
    Ej: 'sma_9', 'sma_21', etc.
    """
    for p in periodos:
        df[f'sma_{p}'] = calcular_sma(df, p)
    return df

def agregar_emas(df, periodos: list):
    """
    Agrega columnas EMA al DataFrame para cada periodo especificado.
    Ej: 'ema_9', 'ema_21', etc.
    """
    for p in periodos:
        df[f'ema_{p}'] = calcular_ema(df, p)
    return df