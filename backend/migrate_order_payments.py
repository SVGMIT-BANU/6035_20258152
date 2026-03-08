"""
Migration: add payment_method, payment_status, transaction_id columns to orders table.
"""

from database import get_connection
from mysql.connector import Error


def run() -> None:
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SHOW COLUMNS FROM orders LIKE 'payment_method'")
        if not cursor.fetchone():
            cursor.execute(
                "ALTER TABLE orders ADD COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT 'COD' AFTER amount"
            )
            print("Added orders.payment_method")
        else:
            print("orders.payment_method already exists")

        cursor.execute("SHOW COLUMNS FROM orders LIKE 'payment_status'")
        if not cursor.fetchone():
            cursor.execute(
                "ALTER TABLE orders ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' AFTER payment_method"
            )
            print("Added orders.payment_status")
        else:
            print("orders.payment_status already exists")

        cursor.execute("SHOW COLUMNS FROM orders LIKE 'transaction_id'")
        if not cursor.fetchone():
            cursor.execute(
                "ALTER TABLE orders ADD COLUMN transaction_id VARCHAR(64) NULL AFTER payment_status"
            )
            print("Added orders.transaction_id")
        else:
            print("orders.transaction_id already exists")

        conn.commit()
        print("Migration complete.")
    except Error as exc:
        print(f"Migration failed: {exc}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


if __name__ == "__main__":
    run()
