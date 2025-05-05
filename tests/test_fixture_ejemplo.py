import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from wscliente import cliente_binance
import json
import asyncio


def mensaje_kline_mock():
    return {
        "e": "kline",
        "E": 123456789,
        "s": "BTCUSDT",
        "k": {
            "t": 123400000,
            "T": 123460000,
            "s": "BTCUSDT",
            "i": "1m",
            "f": 100,
            "L": 200,
            "o": "0.0010",
            "c": "0.0020",
            "h": "0.0025",
            "l": "0.0005",
            "v": "1000",
            "n": 100,
            "x": False,
            "q": "1.0000",
            "V": "500",
            "Q": "0.500",
            "B": "123456"
        }
    }


@patch("websockets.connect")
@pytest.mark.asyncio
async def test_wscliente_recibe_kline(mock_ws_connect):
    # Simular conexión y recepción de mensaje
    ws_mock = MagicMock()
    from unittest.mock import AsyncMock
    ws_mock.recv = AsyncMock(side_effect=[
        json.dumps(mensaje_kline_mock()),
        json.dumps(mensaje_kline_mock()),
        json.dumps(mensaje_kline_mock()),
        asyncio.CancelledError("fin")
    ])
    mock_ws_connect.return_value.__aenter__.return_value = ws_mock

    resultados = []

    def procesador_kline(msg):
        resultados.append(msg["s"])

    cliente = cliente_binance.BinanceWebSocket("btcusdt", "1m", procesador_kline)
    try:
        await cliente._escuchar()
    except asyncio.CancelledError:
        pass  # corte intencional esperado

    assert resultados == ["BTCUSDT", "BTCUSDT", "BTCUSDT"]


# Test de reconexión automática al recibir ConnectionClosedError
from websockets.exceptions import ConnectionClosedError

@patch("websockets.connect")
@pytest.mark.asyncio
async def test_wscliente_reconecta_si_falla(mock_ws_connect):
    # Simula dos conexiones: la primera falla, la segunda funciona
    mensaje_valido = json.dumps(mensaje_kline_mock())

    ws_fail = MagicMock()
    ws_fail.recv = AsyncMock(side_effect=ConnectionError("test disconnect"))

    ws_success = MagicMock()
    ws_success.recv = AsyncMock(side_effect=[
        mensaje_valido,
        asyncio.CancelledError("fin")
    ])

    # Simula dos intentos de conexión
    mock_ws_connect.side_effect = [AsyncMock(__aenter__=AsyncMock(return_value=ws_fail)),
                                   AsyncMock(__aenter__=AsyncMock(return_value=ws_success))]

    resultados = []

    def procesador_kline(msg):
        resultados.append(msg["s"])
        if len(resultados) >= 1:
            raise asyncio.CancelledError("corte")

    cliente = cliente_binance.BinanceWebSocket("btcusdt", "1m", procesador_kline)

    try:
        await cliente._escuchar()
    except asyncio.CancelledError:
        pass

    assert resultados == ["BTCUSDT"]