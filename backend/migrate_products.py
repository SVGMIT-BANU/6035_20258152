"""
Migration script to add new columns to products table
"""
from database import get_connection
from mysql.connector import Error

def migrate_products_table():
    """Add unit, available_quantity, and description columns if they don't exist."""
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Check if columns exist and add them if they don't
        cursor.execute("SHOW COLUMNS FROM products LIKE 'unit'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE products ADD COLUMN unit VARCHAR(20) DEFAULT 'kg'")
            print("Added 'unit' column")

        cursor.execute("SHOW COLUMNS FROM products LIKE 'available_quantity'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE products ADD COLUMN available_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0")
            print("Added 'available_quantity' column")

        cursor.execute("SHOW COLUMNS FROM products LIKE 'description'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE products ADD COLUMN description TEXT")
            print("Added 'description' column")

        conn.commit()
        cursor.close()
        conn.close()
        print("Migration completed successfully!")

    except Error as e:
        print(f"Migration error: {e}")

if __name__ == "__main__":
    migrate_products_table()
