from core.repository.base_repository import BaseRepository

class LoaderRepository(BaseRepository):
    def obtener_klines(self, symbol: str, interval: str, start: int = None, end: int = None):
        query = """
            SELECT open_time, open, high, low, close, volume, close_time
            FROM klines
            WHERE symbol = ?
              AND interval = ?
        """
        params = [symbol, interval]

        if start:
            query += " AND open_time >= ?"
            params.append(start)
        if end:
            query += " AND open_time <= ?"
            params.append(end)

        query += " ORDER BY open_time ASC"

        rows = self.fetchall(query, tuple(params))
        return [
            {
                "open_time": row[0],
                "open": float(row[1]),
                "high": float(row[2]),
                "low": float(row[3]),
                "close": float(row[4]),
                "volume": float(row[5]),
                "close_time": row[6],
            }
            for row in rows
        ]