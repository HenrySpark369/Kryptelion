from flask import Flask

def create_app():
    app = Flask(__name__)
    from .routes import dashboard, backtest, live
    from .routes.metrics import metrics_bp
    from .routes import cruces
    from .routes import ordenes
    app.register_blueprint(dashboard.bp)
    app.register_blueprint(backtest.bp)
    app.register_blueprint(live.bp)
    app.register_blueprint(metrics_bp)
    app.register_blueprint(ordenes.bp_ordenes)
    app.register_blueprint(cruces.cruces_bp)
    return app