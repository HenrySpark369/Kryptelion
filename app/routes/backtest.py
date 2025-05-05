from flask import Blueprint, request, jsonify
from core.repository.historico_repository import HistoricoRepository
from estrategias.factory import get_estrategia, estrategias_registradas
from indicadores import agregar_smas
from backtesting.simulador import simular
import logging

logging.basicConfig(level=logging.INFO)

bp = Blueprint("backtest", __name__)

@bp.route("/backtest", methods=["POST"])
def backtest():
    req = request.get_json()
    symbol = req.get("symbol")
    interval = req.get("interval")
    strategy_name = req.get("strategy", "sma_cruce")
    capital_inicial = float(req.get("capital", 1000))

    if not symbol or not interval:
        return jsonify({"error": "El símbolo y el intervalo son requeridos"}), 400
    if capital_inicial <= 0:
        return jsonify({"error": "El capital debe ser un valor positivo"}), 400
    if strategy_name not in estrategias_registradas:
        return jsonify({"error": f"Estrategia {strategy_name} no registrada"}), 400

    logging.info(f"Iniciando backtest para {symbol} con intervalo {interval}")

    table_name = f"{symbol}_{interval}"
    try:
        repo = HistoricoRepository("datos_historicos.db")
        df = repo.get_dataframe(table_name)
    except Exception as e:
        return jsonify({"error": f"Error al cargar los datos: {str(e)}"}), 500

    start_date = req.get("start_date")
    end_date = req.get("end_date")
    if start_date and end_date:
        df = df[(df["timestamp"] >= start_date) & (df["timestamp"] <= end_date)]

    # Agregar indicadores requeridos por sma_cruce
    df = agregar_smas(df, [9, 21])
    df["sma_fast"] = df["sma_9"]
    df["sma_slow"] = df["sma_21"]

    operaciones, capital_final, equity_df = simular(df, strategy_name, capital_inicial=capital_inicial)

    return jsonify({
        "capital_final": capital_final,
        "operaciones": operaciones,
        "equity": equity_df.to_dict(orient="records")
    })