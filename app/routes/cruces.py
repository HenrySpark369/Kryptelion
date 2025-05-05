from flask import Blueprint, jsonify
import sqlite3
from core.repository.historico_repository import HistoricoRepository  # Usamos la clase, no la función

# Crear el blueprint para la ruta
cruces_bp = Blueprint('cruces', __name__)

# Ruta para obtener los últimos cruces de medias móviles
@cruces_bp.route('/ultimos_cruces', methods=['GET'])
def ultimos_cruces():
    try:
        # Crear instancia del repositorio y llamar al método
        repo = HistoricoRepository()
        cruces = repo.get_last_crosses("BTCUSDT", "1m")

        if not cruces:
            return jsonify({"message": "No se encontraron cruces recientes."}), 404

        return jsonify({"cruces": cruces}), 200

    except sqlite3.Error as db_error:
        return jsonify({"error": "Error en la base de datos", "detalle": str(db_error)}), 500

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Error inesperado", "detalle": str(e)}), 500