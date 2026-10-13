
from db import get_db_connection

try:
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT DATABASE()")
    print("Connected database:", cursor.fetchone()[0])

    cursor.execute("SHOW TABLES")
    print("Tables:", cursor.fetchall())

    cursor.close()
    conn.close()

except Exception as e:
    print("Database connection failed:", e)