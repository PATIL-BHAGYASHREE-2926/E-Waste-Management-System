import mysql.connector

def get_db_connection():
    connection = mysql.connector.connect(
        host="localhost",
        user="root",
        password="Pass@1234",
        database="ecosmart"
    )
    return connection

import mysql.connector

def get_db_connection():
    connection = mysql.connector.connect(
        host="localhost",
        user="root",
        password="Pass@1234",
        database="ecosmart"
    )
    return connection


# Test connection
try:
    conn = get_db_connection()
    print(" Database connected successfully!")
    conn.close()
except Exception as e:
    print(" Connection failed:", e)