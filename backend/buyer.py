"""
Buyer dashboard and saved products services.
"""

from database import get_connection
from mysql.connector import Error


def _ensure_buyer_schema(cursor) -> None:
    cursor.execute("SHOW TABLES LIKE 'complaints'")
    if not cursor.fetchone():
        cursor.execute(
            """
            CREATE TABLE complaints (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NULL,
                farmer_id INT NOT NULL,
                buyer_id INT NULL,
                subject VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                status VARCHAR(30) NOT NULL DEFAULT 'Open',
                resolution_note TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP NULL DEFAULT NULL,
                FOREIGN KEY (farmer_id) REFERENCES users(id)
            )
            """
        )


def get_saved_products(buyer_id: int) -> dict:
    """Get saved products for a buyer."""
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """SELECT p.id, p.farmer_id, p.name, p.category, p.quality, p.price, p.quantity,
                      p.unit, p.available_quantity, p.image_url, p.description, p.status, p.created_at,
                      u.name AS farmer_name
               FROM saved_products s
               JOIN products p ON s.product_id = p.id
               JOIN users u ON p.farmer_id = u.id
               WHERE s.buyer_id = %s AND p.status = 'Active'
               ORDER BY s.created_at DESC""",
            (buyer_id,),
        )
        products = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"success": True, "products": products}
    except Error as e:
        return {"success": False, "message": str(e), "products": []}


def add_saved_product(buyer_id: int, product_id: int) -> dict:
    """Save a product for buyer."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT IGNORE INTO saved_products (buyer_id, product_id) VALUES (%s, %s)",
            (buyer_id, product_id),
        )
        conn.commit()
        added = cursor.rowcount > 0
        cursor.close()
        conn.close()
        return {
            "success": True,
            "message": "Saved product added" if added else "Product already saved",
        }
    except Error as e:
        return {"success": False, "message": str(e)}


def remove_saved_product(buyer_id: int, product_id: int) -> dict:
    """Remove saved product."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM saved_products WHERE buyer_id = %s AND product_id = %s",
            (buyer_id, product_id),
        )
        conn.commit()
        cursor.close()
        conn.close()
        return {"success": True, "message": "Saved product removed"}
    except Error as e:
        return {"success": False, "message": str(e)}


def get_buyer_dashboard(buyer_id: int) -> dict:
    """Get dashboard stats, saved products and recent orders for buyer."""
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """SELECT
                    COUNT(*) AS total_orders,
                    COALESCE(SUM(amount), 0) AS total_spent,
                    SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending_orders
               FROM orders
               WHERE buyer_id = %s""",
            (buyer_id,),
        )
        stats = cursor.fetchone() or {}

        cursor.execute(
            """SELECT
                    o.id, o.quantity, o.amount, o.status, o.payment_method, o.payment_status, o.transaction_id, o.created_at,
                    p.name AS product_name,
                    u.name AS farmer_name
               FROM orders o
               JOIN products p ON o.product_id = p.id
               JOIN users u ON o.farmer_id = u.id
               WHERE o.buyer_id = %s
               ORDER BY o.created_at DESC
               LIMIT 20""",
            (buyer_id,),
        )
        recent_orders = cursor.fetchall()

        cursor.execute(
            """SELECT p.id, p.farmer_id, p.name, p.category, p.quality, p.price, p.quantity,
                      p.unit, p.available_quantity, p.image_url, p.description, p.status, p.created_at,
                      u.name AS farmer_name
               FROM saved_products s
               JOIN products p ON s.product_id = p.id
               JOIN users u ON p.farmer_id = u.id
               WHERE s.buyer_id = %s AND p.status = 'Active'
               ORDER BY s.created_at DESC""",
            (buyer_id,),
        )
        saved_products = cursor.fetchall()

        cursor.close()
        conn.close()

        return {
            "success": True,
            "dashboard": {
                "stats": {
                    "total_orders": int(stats.get("total_orders") or 0),
                    "total_spent": float(stats.get("total_spent") or 0),
                    "pending_orders": int(stats.get("pending_orders") or 0),
                    "saved_items": len(saved_products),
                },
                "saved_products": saved_products,
                "recent_orders": recent_orders,
            },
        }
    except Error as e:
        return {"success": False, "message": str(e), "dashboard": None}


def get_buyer_profile(buyer_id: int) -> dict:
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """SELECT id, name, email, phone
               FROM users
               WHERE id = %s AND user_type = 'buyer'""",
            (buyer_id,),
        )
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        if not row:
            return {"success": False, "message": "Buyer not found", "profile": None}
        return {"success": True, "profile": row}
    except Error as e:
        return {"success": False, "message": str(e), "profile": None}


def update_buyer_profile(buyer_id: int, name: str | None = None, phone: str | None = None) -> dict:
    try:
        conn = get_connection()
        cursor = conn.cursor()
        updates = []
        values = []
        if name is not None:
            updates.append("name = %s")
            values.append(name.strip())
        if phone is not None:
            updates.append("phone = %s")
            values.append(phone.strip())
        if not updates:
            cursor.close()
            conn.close()
            return {"success": False, "message": "No fields to update"}
        values.append(buyer_id)
        cursor.execute(
            f"UPDATE users SET {', '.join(updates)} WHERE id = %s AND user_type = 'buyer'",
            tuple(values),
        )
        conn.commit()
        updated = cursor.rowcount
        cursor.close()
        conn.close()
        if updated == 0:
            return {"success": False, "message": "Buyer not found"}
        return {"success": True, "message": "Profile updated"}
    except Error as e:
        return {"success": False, "message": str(e)}


def list_buyer_orders(buyer_id: int, status: str = "") -> dict:
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        if status:
            cursor.execute(
                """SELECT o.id, o.quantity, o.amount, o.status, o.payment_method, o.payment_status, o.transaction_id, o.created_at,
                          p.name AS product_name, u.name AS farmer_name
                   FROM orders o
                   JOIN products p ON o.product_id = p.id
                   JOIN users u ON o.farmer_id = u.id
                   WHERE o.buyer_id = %s AND o.status = %s
                   ORDER BY o.created_at DESC""",
                (buyer_id, status),
            )
        else:
            cursor.execute(
                """SELECT o.id, o.quantity, o.amount, o.status, o.payment_method, o.payment_status, o.transaction_id, o.created_at,
                          p.name AS product_name, u.name AS farmer_name
                   FROM orders o
                   JOIN products p ON o.product_id = p.id
                   JOIN users u ON o.farmer_id = u.id
                   WHERE o.buyer_id = %s
                   ORDER BY o.created_at DESC""",
                (buyer_id,),
            )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"success": True, "orders": rows}
    except Error as e:
        return {"success": False, "message": str(e), "orders": []}


def list_buyer_payments(buyer_id: int, payment_status: str = "") -> dict:
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        if payment_status:
            cursor.execute(
                """SELECT id AS order_id, amount, payment_method, payment_status, transaction_id, created_at, status
                   FROM orders
                   WHERE buyer_id = %s AND payment_status = %s
                   ORDER BY created_at DESC""",
                (buyer_id, payment_status),
            )
        else:
            cursor.execute(
                """SELECT id AS order_id, amount, payment_method, payment_status, transaction_id, created_at, status
                   FROM orders
                   WHERE buyer_id = %s
                   ORDER BY created_at DESC""",
                (buyer_id,),
            )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"success": True, "payments": rows}
    except Error as e:
        return {"success": False, "message": str(e), "payments": []}


def list_buyer_complaints(buyer_id: int) -> dict:
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        _ensure_buyer_schema(cursor)
        cursor.execute(
            """SELECT c.id, c.order_id, c.subject, c.message, c.status, c.resolution_note, c.created_at, c.resolved_at,
                      f.name AS farmer_name
               FROM complaints c
               LEFT JOIN users f ON f.id = c.farmer_id
               WHERE c.buyer_id = %s
               ORDER BY c.created_at DESC""",
            (buyer_id,),
        )
        rows = cursor.fetchall()
        conn.commit()
        cursor.close()
        conn.close()
        return {"success": True, "complaints": rows}
    except Error as e:
        return {"success": False, "message": str(e), "complaints": []}


def add_buyer_complaint(
    buyer_id: int,
    order_id: int,
    subject: str,
    message: str,
) -> dict:
    try:
        if not subject.strip() or not message.strip():
            return {"success": False, "message": "subject and message required"}
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        _ensure_buyer_schema(cursor)
        cursor.execute(
            "SELECT farmer_id FROM orders WHERE id = %s AND buyer_id = %s",
            (order_id, buyer_id),
        )
        order = cursor.fetchone()
        if not order:
            cursor.close()
            conn.close()
            return {"success": False, "message": "Order not found"}
        cursor.execute(
            """INSERT INTO complaints (order_id, farmer_id, buyer_id, subject, message, status)
               VALUES (%s, %s, %s, %s, %s, 'Open')""",
            (order_id, order["farmer_id"], buyer_id, subject.strip(), message.strip()),
        )
        complaint_id = cursor.lastrowid
        conn.commit()
        cursor.close()
        conn.close()
        return {"success": True, "message": "Complaint submitted", "complaint_id": complaint_id}
    except Error as e:
        return {"success": False, "message": str(e), "complaint_id": None}
