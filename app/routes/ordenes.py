from core.repository.ordenes_repository import OrdenesRepository
from flask import Blueprint, jsonify, request

bp_ordenes = Blueprint("ordenes", __name__)

@bp_ordenes.route("/ordenes", methods=["GET"])
def listar_ordenes():
    repo = OrdenesRepository("ordenes.db")
    symbol = request.args.get("symbol")
    estado = request.args.get("estado")

    if estado:
        rows = repo.filtrar_por_estado(estado)
    elif symbol:
        rows = repo.obtener_ordenes(symbol=symbol)
    else:
        rows = repo.obtener_ordenes()

    ordenes = [
        {
            "id": row["id"],
            "timestamp": row["timestamp"],
            "symbol": row["symbol"],
            "lado": row["lado"],
            "precio": row["precio"],
            "cantidad": row["cantidad"],
            "estado": row["estado"]
        }
        for row in rows
    ]
    return jsonify(ordenes)

@bp_ordenes.route("/ordenes", methods=["POST"])
def registrar_orden():
    data = request.get_json()

    required_fields = ["symbol", "lado", "precio", "cantidad"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Faltan campos obligatorios"}), 400

    repo = OrdenesRepository("ordenes.db")
    repo.guardar_orden(
        symbol=data["symbol"],
        lado=data["lado"],
        precio=float(data["precio"]),
        cantidad=float(data["cantidad"]),
        estado=data.get("estado", "pendiente")
    )

    return jsonify({"mensaje": "Orden registrada exitosamente"}), 201

@bp_ordenes.route("/ordenes/<int:id>", methods=["DELETE"])
def eliminar_orden(id):
    repo = OrdenesRepository("ordenes.db")
    exito = repo.eliminar_orden(id)
    if exito:
        return jsonify({"mensaje": f"Orden {id} eliminada"}), 200
    return jsonify({"error": f"No se encontró la orden {id}"}), 404

@bp_ordenes.route("/ordenes/<int:id>", methods=["PUT"])
def actualizar_orden(id):
    data = request.get_json()
    nuevo_estado = data.get("estado")
    if not nuevo_estado:
        return jsonify({"error": "Falta el campo 'estado'"}), 400

    repo = OrdenesRepository("ordenes.db")
    exito = repo.actualizar_estado(id, nuevo_estado)
    if exito:
        return jsonify({"mensaje": f"Estado de la orden {id} actualizado a '{nuevo_estado}'"}), 200
    return jsonify({"error": f"No se encontró la orden {id}"}), 404