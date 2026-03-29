import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def create_db():
    print("Connecting to default postgres database...")
    try:
        # Connect to the default 'postgres' database
        conn = psycopg2.connect(
            dbname="postgres",
            user="postgres",
            password="rennymlndf",
            host="localhost",
            port="5432"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = 'flood_analysis'")
        exists = cursor.fetchone()
        
        if not exists:
            print("Creating database flood_analysis...")
            cursor.execute('CREATE DATABASE flood_analysis')
            print("Database created successfully.")
        else:
            print("Database flood_analysis already exists.")
            
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error creating database: {e}")

if __name__ == "__main__":
    create_db()
