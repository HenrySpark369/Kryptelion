# estrategias/factory.py

estrategias_registradas = {}

def registrar(nombre, clase_estrategia):
    """
    Registra una clase de estrategia bajo un nombre clave.
    """
    estrategias_registradas[nombre] = clase_estrategia

def get_estrategia(nombre, config=None):
    """
    Instancia una estrategia previamente registrada.
    :param nombre: Nombre clave de la estrategia (str)
    :param config: Diccionario opcional de configuración
    :return: Instancia de la estrategia correspondiente
    """
    if nombre in estrategias_registradas:
        return estrategias_registradas[nombre](config=config)
    raise ValueError(f"Estrategia '{nombre}' no reconocida. Registradas: {list(estrategias_registradas.keys())}")

def auto_registrar():
    from estrategias.sma_cruce import EstrategiaSMACruce
    from estrategias.ml_predictor import MLPredictor

    registrar("sma_cruce", EstrategiaSMACruce)
    registrar("ml", MLPredictor)