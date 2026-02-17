from database import get_db_cursor

with get_db_cursor() as (cursor, conn):
    cursor.execute("SELECT * from utilisateurs;")
    print("Resultat:\n", cursor.fetchone())
