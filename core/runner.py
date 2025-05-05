import logging
from core.bot import Bot

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def ejecutar(simbolo, estrategia, datos, modo="simulacion", on_accion=None):
    """
    Ejecuta una estrategia sobre un conjunto de datos históricos o en tiempo real.

    Args:
        simbolo (str): Símbolo de trading (ej. BTCUSDT)
        estrategia: Instancia de la estrategia a aplicar
        datos (iterable): Datos de entrada (cada fila puede ser un dict o lista)
        modo (str): 'simulacion' o 'live'
        on_accion (func): Callback opcional para ejecutar la acción (solo en modo live)
    """
    bot = Bot(estrategia)
    for fila in datos:
        accion = bot.procesar(fila)
        if accion:
            if modo == "simulacion":
                logger.info(f"[SIMULACIÓN] {simbolo}: {accion}")
            elif modo == "live" and on_accion:
                try:
                    on_accion(simbolo, accion)
                    logger.info(f"[LIVE] {simbolo}: Acción ejecutada {accion}")
                except Exception as e:
                    logger.error(f"[LIVE] Error al ejecutar acción {accion}: {e}")

def ejecutar_multiples(simbolos_estrategias, datos_por_simbolo, modo="simulacion", on_accion=None):
    """
    Ejecuta múltiples estrategias sobre distintos símbolos.

    Args:
        simbolos_estrategias (dict): {simbolo: estrategia}
        datos_por_simbolo (dict): {simbolo: iterable de datos}
        modo (str): 'simulacion' o 'live'
        on_accion (func): Callback opcional en modo live
    """
    for simbolo, estrategia in simbolos_estrategias.items():
        datos = datos_por_simbolo.get(simbolo, [])
        ejecutar(simbolo, estrategia, datos, modo=modo, on_accion=on_accion)