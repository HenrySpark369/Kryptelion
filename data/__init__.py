"""
Módulo de gestión de datos para el bot de trading.

Incluye submódulos para:
- loader: carga de datos desde SQLite a DataFrame.
- updater: descarga y actualización de datos OHLCV desde Binance.
- export: exportación de tablas, consulta de cuenta y posiciones activas.

Uso sugerido:
from data import obtener_datos_historicos, actualizar_datos, extraer
"""

from .loader import cargar_datos
from .updater import obtener_datos_historicos, actualizar_datos
from .export import extraer, obtener_info_cuenta, obtener_posiciones_abiertas

__all__ = [
    "cargar_datos",
    "obtener_datos_historicos",
    "actualizar_datos",
    "extraer",
    "obtener_info_cuenta",
    "obtener_posiciones_abiertas",
]