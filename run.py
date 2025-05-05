import os
from app import create_app
from estrategias.factory import auto_registrar
from core.repository.init_db import inicializar_db

auto_registrar()
inicializar_db()

app = create_app()

if __name__ == "__main__":
    host = os.getenv("FLASK_RUN_HOST", "0.0.0.0")
    port = int(os.getenv("FLASK_RUN_PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    app.run(host=host, port=port, debug=debug, use_reloader=False)