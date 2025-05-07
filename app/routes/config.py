from flask import Blueprint, jsonify, current_app
import json
from pathlib import Path

config_bp = Blueprint("config", __name__)

@config_bp.route("/config/intervalos.json", methods=["GET"])
def get_intervalos():
    path = Path(current_app.root_path).parent / "config" / "intervalos.json"
    with open(path) as f:
        data = json.load(f)
    return jsonify(data)