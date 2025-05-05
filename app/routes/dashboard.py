from flask import Blueprint, render_template, request, jsonify
import sqlite3
from datetime import datetime
import csv
import io
from flask import Response
import os

bp = Blueprint("dashboard", __name__)

@bp.route("/")
def index():
    ws_url = os.getenv("FRONTEND_WS_URL", "ws://localhost:8765")
    return render_template("index.html", ws_url=ws_url)

@bp.route("/backtest-ui")
def backtest_ui():
    return render_template("backtest.html")

@bp.route("/guardar_cruces", methods=["POST"])
def guardar_cruces():
    data = request.get_json()
    for cruce in data:
        if "timestamp" not in cruce or "tipo" not in cruce or "precio" not in cruce:
            return jsonify({"status": "error", "message": "Datos de cruce incompletos"}), 400
    try:
        conn = sqlite3.connect("cruces.db")
        c = conn.cursor()
        c.execute("""
            CREATE TABLE IF NOT EXISTS cruces (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                tipo TEXT,
                precio REAL
            )
        """)
        for cruce in data:
            c.execute("INSERT INTO cruces (timestamp, tipo, precio) VALUES (?, ?, ?)", 
                      (cruce["timestamp"], cruce["tipo"], cruce["precio"]))
        conn.commit()
        print(f"Almacenadas {len(data)} señales de cruce")
    except sqlite3.Error as e:
        print(f"Error al acceder a la base de datos: {e}")
        return jsonify({"status": "error", "message": "Error al almacenar los datos"}), 500
    finally:
        conn.close()
    return jsonify({"status": "ok", "almacenadas": len(data)})


# Nueva ruta para consultar las señales almacenadas
@bp.route("/cruces", methods=["GET"])
def consultar_cruces():
    tipo = request.args.get("tipo")  # puede ser "compra", "venta" o None
    if tipo == "None":
        tipo = None
    if tipo not in (None, "compra", "venta"):
        return jsonify({"status": "error", "message": "Tipo inválido. Debe ser 'compra', 'venta' o None"}), 400
    try:
        conn = sqlite3.connect("cruces.db")
        c = conn.cursor()

        if tipo in ("compra", "venta"):
            c.execute("SELECT timestamp, tipo, precio FROM cruces WHERE tipo = ? ORDER BY timestamp DESC", (tipo,))
        else:
            c.execute("SELECT timestamp, tipo, precio FROM cruces ORDER BY timestamp DESC")

        rows = c.fetchall()
    except sqlite3.Error as e:
        print(f"[ERROR /cruces] SQLite: {e}")
        return jsonify({"status": "error", "message": "Error al consultar los cruces"}), 500
    finally:
        conn.close()

    resultados = [{"timestamp": r[0], "tipo": r[1], "precio": r[2]} for r in rows]
    return jsonify(resultados)

@bp.route("/cruces_csv", methods=["GET"])
def descargar_cruces_csv():
    tipo = request.args.get("tipo")  # compra, venta o None
    if tipo not in (None, "compra", "venta"):
        return jsonify({"status": "error", "message": "Tipo inválido. Debe ser 'compra', 'venta' o None"}), 400
    try:
        conn = sqlite3.connect("cruces.db")
        c = conn.cursor()

        if tipo in ("compra", "venta"):
            c.execute("SELECT timestamp, tipo, precio FROM cruces WHERE tipo = ? ORDER BY timestamp DESC", (tipo,))
        else:
            c.execute("SELECT timestamp, tipo, precio FROM cruces ORDER BY timestamp DESC")

        rows = c.fetchall()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["timestamp", "tipo", "precio"])
        writer.writerows(rows)

        output.seek(0)
    except sqlite3.Error as e:
        print(f"[ERROR /cruces_csv] SQLite: {e}")
        return jsonify({"status": "error", "message": "Error al generar el archivo CSV"}), 500
    except Exception as e:
        print(f"Error inesperado: {e}")
        return jsonify({"status": "error", "message": "Error al generar el archivo CSV"}), 500
    finally:
        conn.close()

    return Response(output.getvalue(), mimetype="text/csv", headers={"Content-Disposition": "attachment; filename=cruces.csv"})

@bp.route("/ultimos_cruces", methods=["GET"])
def ultimos_cruces():
    try:
        conn = sqlite3.connect("cruces.db")
        c = conn.cursor()
        c.execute("SELECT timestamp, tipo, precio FROM cruces ORDER BY timestamp DESC LIMIT 10")
        rows = c.fetchall()
    except sqlite3.Error as e:
        print(f"[ERROR /ultimos_cruces] SQLite: {e}")
        return jsonify({"status": "error", "message": "Error al consultar los últimos cruces"}), 500
    finally:
        conn.close()

    resultados = [{"timestamp": r[0], "tipo": r[1], "precio": r[2]} for r in rows]
    return jsonify(resultados)