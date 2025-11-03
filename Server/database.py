import pymysql
from contextlib import contextmanager
from config import Config

@contextmanager
def get_db_connection():
    conn = None
    try:
        conn = pymysql.connect(
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
            port=getattr(Config, "DB_PORT", 3306),
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=False
        )
        yield conn
    except pymysql.MySQLError as e:
        print(f"Erreur de connexion à la base MySQL: {e}")
        raise
    finally:
        if conn:
            conn.close()

@contextmanager
def get_db_cursor():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        try:
            yield cursor, conn
        finally:
            cursor.close()
