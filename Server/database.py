import pyodbc
from contextlib import contextmanager
from config import Config

@contextmanager
def get_db_connection():
    conn_str = (
        f"Driver={{SQL Server}};"
        f"Server={Config.DB_SERVER};"
        f"Database={Config.DB_NAME};"
        f"Trusted_Connection={Config.DB_TRUSTED_CONNECTION};"
    )
    conn = None
    try:
        conn = pyodbc.connect(conn_str)
        yield conn
    except pyodbc.Error as e:
        print(f"Erreur de connexion à la base de données: {e}")
        raise
    finally:
        if conn:
            conn.close()

@contextmanager
def get_cursor_with_conn():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        yield cursor, conn
    finally:
        cursor.close()
        conn.close()

@contextmanager
def get_db_cursor():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        try:
            yield cursor,conn
        finally:
            cursor.close() 
