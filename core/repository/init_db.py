import sqlite3

def inicializar_db():
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
    conn.commit()
    conn.close()
    print("✅ Tabla 'cruces' verificada/creada.")