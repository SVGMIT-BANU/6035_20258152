"""
MySQL database connection for Fresh AI Trade.
Uses username: root, password: root.
"""

import mysql.connector
from mysql.connector import Error

# Database configuration
DB_CONFIG = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "root",
    "database": "fresh_ai_trade",
    "autocommit": True,
}


def get_connection(database=None, use_database=True):
    """
    Create and return a MySQL connection.
    - database: override database name if provided.
    - use_database: if False, do not select a database (for creating DB).
    """
    config = {**DB_CONFIG}
    if not use_database:
        config.pop("database", None)
    elif database:
        config["database"] = database
    return mysql.connector.connect(**config)


def test_connection():
    """Test the MySQL connection and print status."""
    try:
        conn = get_connection()
        if conn.is_connected():
            cursor = conn.cursor()
            cursor.execute("SELECT VERSION();")
            version = cursor.fetchone()
            print(f"Connected to MySQL Server version {version[0]}")
            cursor.close()
            conn.close()
            return True
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return False


def create_database():
    """Create the fresh_ai_trade database if it doesn't exist."""
    try:
        conn = get_connection(use_database=False)
        cursor = conn.cursor()
        cursor.execute("CREATE DATABASE IF NOT EXISTS fresh_ai_trade")
        print("Database 'fresh_ai_trade' ready.")
        cursor.close()
        conn.close()
    except Error as e:
        print(f"Error creating database: {e}")
        raise


def init_schema(conn):
    """Create tables for users, products, orders if they don't exist."""
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE,
            phone VARCHAR(50) UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            user_type ENUM('farmer', 'buyer', 'admin') NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            farmer_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            category ENUM('Vegetable', 'Fruit') NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            quantity VARCHAR(50) NOT NULL,
            unit VARCHAR(20) DEFAULT 'kg',
            available_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
            quality ENUM('Organic', 'Premium', 'Standard') NOT NULL,
            status ENUM('Active', 'Inactive') DEFAULT 'Active',
            image_url VARCHAR(500),
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (farmer_id) REFERENCES users(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            buyer_id INT NOT NULL,
            product_id INT NOT NULL,
            farmer_id INT NOT NULL,
            quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
            amount DECIMAL(10, 2) NOT NULL,
            payment_method VARCHAR(20) NOT NULL DEFAULT 'COD',
            payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
            transaction_id VARCHAR(64) NULL,
            status VARCHAR(50) DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (buyer_id) REFERENCES users(id),
            FOREIGN KEY (product_id) REFERENCES products(id),
            FOREIGN KEY (farmer_id) REFERENCES users(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cart_items (
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

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS saved_products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            buyer_id INT NOT NULL,
            product_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY (buyer_id, product_id),
            FOREIGN KEY (buyer_id) REFERENCES users(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    """)

    print("Tables created or already exist.")
    cursor.close()


if __name__ == "__main__":
    print("Testing MySQL connection (user=root, password=root)...")
    if test_connection():
        print("Connection OK.")
        create_database()
        conn = get_connection()
        init_schema(conn)
        conn.close()
        print("Setup complete.")
    else:
        print("Could not connect. Check MySQL is running and credentials.")
