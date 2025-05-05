class Estado:
    def transicionar(self, señal):
        raise NotImplementedError
    def accion(self):
        raise NotImplementedError

class EstadoEsperando(Estado):
    def transicionar(self, señal):
        if señal == "comprar":
            return EstadoOperando()
        return self
    def accion(self):
        return None

class EstadoOperando(Estado):
    def transicionar(self, señal):
        if señal == "vender":
            return EstadoEsperando()
        return self
    def accion(self):
        return "Ejecutar orden"