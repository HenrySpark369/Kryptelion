from estrategias.factory import get_estrategia
from core.state import EstadoEsperando, EstadoOperando

class Bot:
    def __init__(self, estrategia):
        self.estrategia = get_estrategia(estrategia)
        self.estado = EstadoEsperando()

    def procesar(self, datos):
        señal = self.estrategia.evaluar(datos)
        self.estado = self.estado.transicionar(señal)
        return self.estado.accion()