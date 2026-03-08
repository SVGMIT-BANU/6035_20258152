"""
Farmer dashboard services: profile, orders, reports, complaints, overview.
"""

from database import get_connection
from mysql.connector import Error


def _ensure_farmer_schema(cursor) -> None:
    cursor.execute("SHOW COLUMNS FROM users LIKE 'farm_location'")
    if not cursor.fetchone():
        cursor.execute(
            "ALTER TABLE users ADD COLUMN farm_location VARCHAR(255) NULL AFTER phone"
        )

    cursor.execute("SHOW COLUMNS FROM products LIKE 'approval_status'")
    if not cursor.fetchone():
        cursor.execute(
            "ALTER TABLE products ADD COLUMN approval_status VARCHAR(20) NOT NULL DEFAULT 'Approved' AFTER status"
        )

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

    cursor.execute("SHOW TABLES LIKE 'farmer_documents'")
    if not cursor.fetchone():
        cursor.execute(
            """
            CREATE TABLE farmer_documents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                farmer_id INT NOT NULL,
                document_name VARCHAR(255) NOT NULL,
                document_url VARCHAR(500) NOT NULL,
                verification_status VARCHAR(30) NOT NULL DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (farmer_id) REFERENCES users(id)
            )
            """
        )


def get_farmer_profile(farmer_id: int) -> dict:
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        _ensure_farmer_schema(cursor)
        cursor.execute(
            """SELECT id, name, email, phone, COALESCE(farm_location, '') AS farm_location
               FROM users
               WHERE id = %s AND user_type = 'farmer'""",
            (farmer_id,),
        )
        row = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()
        if not row:
            return {"success": False, "message": "Farmer not found", "profile": None}
        return {"success": True, "profile": row}
    except Error as e:
        return {"success": False, "message": str(e), "profile": None}


def update_farmer_profile(
    farmer_id: int,
    name: str | None = None,
    phone: str | None = None,
    farm_location: str | None = None,
) -> dict:
    try:
        conn = get_connection()
        cursor = conn.cursor()
        _ensure_farmer_schema(cursor)
        updates = []
        values = []

        if name is not None:
            updates.append("name = %s")
            values.append(name.strip())
        if phone is not None:
            updates.append("phone = %s")
            values.append(phone.strip())
        if farm_location is not None:
            updates.append("farm_location = %s")
            values.append(farm_location.strip())

        if not updates:
            cursor.close()
            conn.close()
            return {"success": False, "message": "No fields to update"}

        values.append(farmer_id)
        cursor.execute(
            f"UPDATE users SET {', '.join(updates)} WHERE id = %s AND user_type = 'farmer'",
            tuple(values),
        )
        conn.commit()
        updated = cursor.rowcount
        cursor.close()
        conn.close()
        if updated == 0:
            return {"success": False, "message": "Farmer not found"}
        return {"success": True, "message": "Profile updated"}
    except Error as e:
        return {"success": False, "message": str(e)}


def get_farmer_overview(farmer_id: int) -> dict:
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        _ensure_farmer_schema(cursor)

        cursor.execute(
            """SELECT
                    COUNT(*) AS total_products,
                    SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active_products,
                    SUM(CASE WHEN approval_status = 'Pending' THEN 1 ELSE 0 END) AS pending_products
               FROM products
               WHERE farmer_id = %s""",
            (farmer_id,),
        )
        products = cursor.fetchone() or {}

        cursor.execute(
            """SELECT
                    COUNT(*) AS total_orders,
                    SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending_orders,
                    COALESCE(SUM(amount), 0) AS total_revenue
               FROM orders
               WHERE farmer_id = %s""",
            (farmer_id,),
        )
        orders = cursor.fetchone() or {}

        cursor.execute(
            """SELECT COUNT(*) AS open_complaints
               FROM complaints
               WHERE farmer_id = %s AND status IN ('Open', 'In Progress')""",
            (farmer_id,),
        )
        complaints = cursor.fetchone() or {}

        conn.commit()
        cursor.close()
        conn.close()
        return {
            "success": True,
            "overview": {
                "total_products": int(products.get("total_products") or 0),
                "active_products": int(products.get("active_products") or 0),
                "pending_products": int(products.get("pending_products") or 0),
                "total_orders": int(orders.get("total_orders") or 0),
                "pending_orders": int(orders.get("pending_orders") or 0),
                "total_revenue": float(orders.get("total_revenue") or 0),
                "open_complaints": int(complaints.get("open_complaints") or 0),
            },
        }
    except Error as e:
        return {"success": False, "message": str(e), "overview": None}


def list_farmer_orders(farmer_id: int, status: str = "") -> dict:
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        if status:
            cursor.execute(
                """SELECT o.id, o.status, o.quantity, o.amount, o.payment_method, o.payment_status, o.created_at,
                          p.name AS product_name, b.name AS buyer_name, b.phone AS buyer_phone
                   FROM orders o
                   JOIN products p ON p.id = o.product_id
                   JOIN users b ON b.id = o.buyer_id
                   WHERE o.farmer_id = %s AND o.status = %s
                   ORDER BY o.created_at DESC""",
                (farmer_id, status),
            )
        else:
            cursor.execute(
                """SELECT o.id, o.status, o.quantity, o.amount, o.payment_method, o.payment_status, o.created_at,
                          p.name AS product_name, b.name AS buyer_name, b.phone AS buyer_phone
                   FROM orders o
                   JOIN products p ON p.id = o.product_id
                   JOIN users b ON b.id = o.buyer_id
                   WHERE o.farmer_id = %s
                   ORDER BY o.created_at DESC""",
                (farmer_id,),
            )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"success": True, "orders": rows}
    except Error as e:
        return {"success": False, "message": str(e), "orders": []}


def update_farmer_order_status(farmer_id: int, order_id: int, status: str) -> dict:
    try:
        allowed = {"Pending", "Confirmed", "Out for Delivery", "Delivered", "Cancelled"}
        if status not in allowed:
            return {"success": False, "message": "Invalid status"}
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE orders SET status = %s WHERE id = %s AND farmer_id = %s",
            (status, order_id, farmer_id),
        )
        conn.commit()
        updated = cursor.rowcount
        cursor.close()
        conn.close()
        if updated == 0:
            return {"success": False, "message": "Order not found"}
        return {"success": True, "message": "Order status updated"}
    except Error as e:
        return {"success": False, "message": str(e)}


def get_farmer_reports(farmer_id: int, days: int = 30) -> dict:
    try:
        period = max(1, min(days, 365))
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """SELECT DATE(created_at) AS report_date, COUNT(*) AS orders, COALESCE(SUM(amount), 0) AS revenue
               FROM orders
               WHERE farmer_id = %s
                 AND created_at >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
               GROUP BY DATE(created_at)
               ORDER BY report_date DESC""",
            (farmer_id, period),
        )
        daily = cursor.fetchall()

        cursor.execute(
            """SELECT p.name, COUNT(*) AS order_count
               FROM orders o
               JOIN products p ON p.id = o.product_id
               WHERE o.farmer_id = %s
                 AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
               GROUP BY p.id, p.name
               ORDER BY order_count DESC
               LIMIT 10""",
            (farmer_id, period),
        )
        top = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"success": True, "daily_sales": daily, "top_products": top}
    except Error as e:
        return {"success": False, "message": str(e), "daily_sales": [], "top_products": []}


def list_farmer_complaints(farmer_id: int, status: str = "") -> dict:
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        _ensure_farmer_schema(cursor)
        if status:
            cursor.execute(
                """SELECT c.id, c.order_id, c.subject, c.message, c.status, c.resolution_note, c.created_at, c.resolved_at,
                          u.name AS buyer_name
                   FROM complaints c
                   LEFT JOIN users u ON u.id = c.buyer_id
                   WHERE c.farmer_id = %s AND c.status = %s
                   ORDER BY c.created_at DESC""",
                (farmer_id, status),
            )
        else:
            cursor.execute(
                """SELECT c.id, c.order_id, c.subject, c.message, c.status, c.resolution_note, c.created_at, c.resolved_at,
                          u.name AS buyer_name
                   FROM complaints c
                   LEFT JOIN users u ON u.id = c.buyer_id
                   WHERE c.farmer_id = %s
                   ORDER BY c.created_at DESC""",
                (farmer_id,),
            )
        rows = cursor.fetchall()
        conn.commit()
        cursor.close()
        conn.close()
        return {"success": True, "complaints": rows}
    except Error as e:
        return {"success": False, "message": str(e), "complaints": []}


def resolve_farmer_complaint(farmer_id: int, complaint_id: int, note: str = "") -> dict:
    try:
        conn = get_connection()
        cursor = conn.cursor()
        _ensure_farmer_schema(cursor)
        cursor.execute(
            """UPDATE complaints
               SET status = 'Resolved', resolution_note = %s, resolved_at = NOW()
               WHERE id = %s AND farmer_id = %s""",
            (note.strip(), complaint_id, farmer_id),
        )
        conn.commit()
        updated = cursor.rowcount
        cursor.close()
        conn.close()
        if updated == 0:
            return {"success": False, "message": "Complaint not found"}
        return {"success": True, "message": "Complaint resolved"}
    except Error as e:
        return {"success": False, "message": str(e)}


def list_farmer_documents(farmer_id: int) -> dict:
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        _ensure_farmer_schema(cursor)
        cursor.execute(
            """SELECT id, document_name, document_url, verification_status, created_at
               FROM farmer_documents
               WHERE farmer_id = %s
               ORDER BY created_at DESC""",
            (farmer_id,),
        )
        rows = cursor.fetchall()
        conn.commit()
        cursor.close()
        conn.close()
        return {"success": True, "documents": rows}
    except Error as e:
        return {"success": False, "message": str(e), "documents": []}


def add_farmer_document(farmer_id: int, document_name: str, document_url: str) -> dict:
    try:
        if not document_name.strip() or not document_url.strip():
            return {"success": False, "message": "document_name and document_url required"}
        conn = get_connection()
        cursor = conn.cursor()
        _ensure_farmer_schema(cursor)
        cursor.execute(
            """INSERT INTO farmer_documents (farmer_id, document_name, document_url, verification_status)
               VALUES (%s, %s, %s, 'Pending')""",
            (farmer_id, document_name.strip(), document_url.strip()),
        )
        conn.commit()
        doc_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return {"success": True, "message": "Document uploaded", "document_id": doc_id}
    except Error as e:
        return {"success": False, "message": str(e), "document_id": None}
