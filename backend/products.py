"""
Product management functions for farmers.
Handles product creation, reading, updating, and deletion.
"""

from database import get_connection
from mysql.connector import Error


def _ensure_product_admin_columns(cursor) -> None:
    cursor.execute("SHOW COLUMNS FROM products LIKE 'approval_status'")
    if not cursor.fetchone():
        cursor.execute(
            "ALTER TABLE products ADD COLUMN approval_status VARCHAR(20) NOT NULL DEFAULT 'Approved' AFTER status"
        )


def create_product(farmer_id: int, name: str, category: str, quality: str, price: float,
                   unit: str, available_quantity: float, image_url: str = None,
                   description: str = None) -> dict:
    """
    Create a new product.
    Returns: {"success": bool, "message": str, "product_id": int or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        _ensure_product_admin_columns(cursor)

        # Validate category
        valid_categories = ['Vegetable', 'Fruit']
        if category not in valid_categories:
            cursor.close()
            conn.close()
            return {"success": False, "message": f"Invalid category. Must be one of: {', '.join(valid_categories)}", "product_id": None}

        # Validate quality
        valid_qualities = ['Organic', 'Premium', 'Standard']
        if quality not in valid_qualities:
            cursor.close()
            conn.close()
            return {"success": False, "message": f"Invalid quality. Must be one of: {', '.join(valid_qualities)}", "product_id": None}

        # Format quantity string
        quantity_str = f"{available_quantity} {unit}"

        # Insert new product
        cursor.execute(
            """INSERT INTO products (farmer_id, name, category, quality, price, quantity, unit, available_quantity, image_url, description, status, approval_status)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Inactive', 'Pending')""",
            (farmer_id, name, category, quality, price, quantity_str, unit, available_quantity, image_url or None, description or None)
        )
        product_id = cursor.lastrowid
        conn.commit()

        cursor.close()
        conn.close()

        return {
            "success": True,
            "message": "Product created successfully",
            "product_id": product_id
        }

    except Error as e:
        return {"success": False, "message": f"Database error: {str(e)}", "product_id": None}


def get_all_products_for_marketplace() -> dict:
    """
    Get all active products for marketplace with farmer name.
    Returns: {"success": bool, "products": list or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        _ensure_product_admin_columns(cursor)
        cursor.execute(
            """SELECT p.id, p.farmer_id, p.name, p.category, p.quality, p.price, p.quantity,
                      p.unit, p.available_quantity, p.image_url, p.description, p.status, p.created_at,
                      u.name AS farmer_name
               FROM products p
               JOIN users u ON p.farmer_id = u.id
               WHERE p.status = 'Active'
                 AND p.approval_status = 'Approved'
                 AND p.available_quantity > 0
               ORDER BY p.created_at DESC"""
        )
        products = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"success": True, "products": products}
    except Error as e:
        return {"success": False, "message": f"Database error: {str(e)}", "products": None}


def get_products_by_farmer(farmer_id: int) -> dict:
    """
    Get all products for a specific farmer.
    Returns: {"success": bool, "products": list or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        _ensure_product_admin_columns(cursor)

        cursor.execute(
            """SELECT id, name, category, quality, price, quantity, unit, available_quantity,
                      image_url, description, status, approval_status, created_at
               FROM products
               WHERE farmer_id = %s
               ORDER BY created_at DESC""",
            (farmer_id,)
        )
        products = cursor.fetchall()

        cursor.close()
        conn.close()

        return {
            "success": True,
            "products": products
        }

    except Error as e:
        return {"success": False, "message": f"Database error: {str(e)}", "products": None}


def get_product(product_id: int) -> dict:
    """
    Get a single product by ID.
    Returns: {"success": bool, "product": dict or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        _ensure_product_admin_columns(cursor)

        cursor.execute(
            """SELECT p.id, p.farmer_id, p.name, p.category, p.quality, p.price, p.quantity, p.unit,
                      p.available_quantity, p.image_url, p.description, p.status, p.created_at,
                      u.name AS farmer_name
               FROM products p
               JOIN users u ON p.farmer_id = u.id
               WHERE p.id = %s""",
            (product_id,)
        )
        product = cursor.fetchone()

        cursor.close()
        conn.close()

        if not product:
            return {"success": False, "message": "Product not found", "product": None}

        return {
            "success": True,
            "product": product
        }

    except Error as e:
        return {"success": False, "message": f"Database error: {str(e)}", "product": None}


def update_product(product_id: int, farmer_id: int, name: str = None, category: str = None,
                   quality: str = None, price: float = None, unit: str = None,
                   available_quantity: float = None, image_url: str = None,
                   description: str = None, status: str = None) -> dict:
    """
    Update a product.
    Returns: {"success": bool, "message": str}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # First verify the product belongs to the farmer
        cursor.execute("SELECT farmer_id FROM products WHERE id = %s", (product_id,))
        product = cursor.fetchone()

        if not product:
            cursor.close()
            conn.close()
            return {"success": False, "message": "Product not found"}

        if product['farmer_id'] != farmer_id:
            cursor.close()
            conn.close()
            return {"success": False, "message": "You don't have permission to update this product"}

        # Build update query dynamically
        updates = []
        values = []

        if name is not None:
            updates.append("name = %s")
            values.append(name)
        if category is not None:
            updates.append("category = %s")
            values.append(category)
        if quality is not None:
            updates.append("quality = %s")
            values.append(quality)
        if price is not None:
            updates.append("price = %s")
            values.append(price)
        if unit is not None and available_quantity is not None:
            updates.append("unit = %s")
            values.append(unit)
            updates.append("available_quantity = %s")
            values.append(available_quantity)
            updates.append("quantity = %s")
            values.append(f"{available_quantity} {unit}")
        if image_url is not None:
            updates.append("image_url = %s")
            values.append(image_url)
        if description is not None:
            updates.append("description = %s")
            values.append(description)
        if status is not None:
            updates.append("status = %s")
            values.append(status)

        if not updates:
            cursor.close()
            conn.close()
            return {"success": False, "message": "No fields to update"}

        values.append(product_id)
        query = f"UPDATE products SET {', '.join(updates)} WHERE id = %s"
        cursor.execute(query, values)
        conn.commit()

        cursor.close()
        conn.close()

        return {
            "success": True,
            "message": "Product updated successfully"
        }

    except Error as e:
        return {"success": False, "message": f"Database error: {str(e)}"}


def delete_product(product_id: int, farmer_id: int) -> dict:
    """
    Delete a product.
    Returns: {"success": bool, "message": str}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # First verify the product belongs to the farmer
        cursor.execute("SELECT farmer_id FROM products WHERE id = %s", (product_id,))
        product = cursor.fetchone()

        if not product:
            cursor.close()
            conn.close()
            return {"success": False, "message": "Product not found"}

        if product['farmer_id'] != farmer_id:
            cursor.close()
            conn.close()
            return {"success": False, "message": "You don't have permission to delete this product"}

        # Delete the product
        cursor.execute("DELETE FROM products WHERE id = %s", (product_id,))
        conn.commit()

        cursor.close()
        conn.close()

        return {
            "success": True,
            "message": "Product deleted successfully"
        }

    except Error as e:
        return {"success": False, "message": f"Database error: {str(e)}"}
