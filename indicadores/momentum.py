def calcular_rsi(df, periodos=14):
    delta = df['close'].diff()
    ganancia = delta.clip(lower=0)
    perdida = -delta.clip(upper=0)
    media_ganancia = ganancia.rolling(periodos).mean()
    media_perdida = perdida.rolling(periodos).mean()
    rs = media_ganancia / media_perdida
    return 100 - (100 / (1 + rs))


def calcular_stochastic_oscillator(df, k_period=14, d_period=3):
    """
    Calcula el estocástico lento %K y %D.
    %K = (Cierre actual - Mínimo n) / (Máximo n - Mínimo n) * 100
    %D = Media móvil simple de %K

    Retorna el DataFrame original con columnas 'stoch_k' y 'stoch_d'.
    """
    low_min = df['low'].rolling(window=k_period).min()
    high_max = df['high'].rolling(window=k_period).max()

    df['stoch_k'] = 100 * ((df['close'] - low_min) / (high_max - low_min))
    df['stoch_d'] = df['stoch_k'].rolling(window=d_period).mean()
    
    return df