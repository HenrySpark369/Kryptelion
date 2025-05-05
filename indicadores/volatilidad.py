def calcular_atr(df, periodos=14):
    """
    Calcula el Average True Range (ATR) y lo agrega al DataFrame como 'atr'.

    :param df: DataFrame con columnas 'high', 'low', 'close'
    :param periodos: número de periodos para el ATR
    :return: DataFrame con columna 'atr'
    """
    rango1 = df['high'] - df['low']
    rango2 = abs(df['high'] - df['close'].shift())
    rango3 = abs(df['low'] - df['close'].shift())
    rango_verdadero = pd.concat([rango1, rango2, rango3], axis=1).max(axis=1)
    df['atr'] = rango_verdadero.rolling(window=periodos).mean()
    return df

def calcular_bollinger(df, periodos=20):
    """
    Calcula Bandas de Bollinger y las agrega al DataFrame:
    - 'bollinger_mid': media móvil
    - 'bollinger_upper': banda superior
    - 'bollinger_lower': banda inferior

    :param df: DataFrame con columna 'close'
    :param periodos: número de periodos para la media
    :return: DataFrame con las tres bandas agregadas
    """
    sma = df['close'].rolling(window=periodos).mean()
    std = df['close'].rolling(window=periodos).std()
    df['bollinger_mid'] = sma
    df['bollinger_upper'] = sma + 2 * std
    df['bollinger_lower'] = sma - 2 * std
    return df