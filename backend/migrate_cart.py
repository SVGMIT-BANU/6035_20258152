"""
Migration: add cart_items table and quantity column to orders
"""
from database import get_connection
from mysql.connector import Error

def migrate():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SHOW TABLES LIKE 'cart_items'")
        if not cursor.fetchone():
            cursor.execute("""
                CREATE TABLE cart_items (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    buyer_id INT NOT NULL,
                    product_id INT NOT NULL,
                    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_buyer_product (buyer_id, product_id),
                    FOREIGN KEY (buyer_id) REFERENCES users(id),
                    FOREIGN KEY (product_id) REFERENCES products(id)
                )
            """)
            print("Created cart_items table.")
        cursor.execute("SHOW COLUMNS FROM orders LIKE 'quantity'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE orders ADD COLUMN quantity DECIMAL(10, 2) NOT NULL DEFAULT 1 AFTER farmer_id")
            print("Added quantity to orders.")
        conn.commit()
        print("Cart migration done.")
    except Error as e:
        print(f"Error: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
