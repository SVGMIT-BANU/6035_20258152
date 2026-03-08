"""
Admin services for dashboard pages and moderation actions.
"""

from database import get_connection
from mysql.connector import Error


def ensure_admin_columns() -> None:
    """Add admin workflow columns if they do not exist."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SHOW COLUMNS FROM users LIKE 'account_status'")
    if not cursor.fetchone():
        cursor.execute(
            "ALTER TABLE users ADD COLUMN account_status VARCHAR(20) NOT NULL DEFAULT 'Active' AFTER user_type"
        )

    cursor.execute("SHOW COLUMNS FROM users LIKE 'approval_status'")
    if not cursor.fetchone():
        cursor.execute(
            "ALTER TABLE users ADD COLUMN approval_status VARCHAR(20) NOT NULL DEFAULT 'Approved' AFTER account_status"
        )
        cursor.execute(
            "UPDATE users SET approval_status = 'Pending' WHERE user_type = 'farmer' AND approval_status IS NULL"
        )

    cursor.execute("SHOW COLUMNS FROM products LIKE 'approval_status'")
    if not cursor.fetchone():
        cursor.execute(
            "ALTER TABLE products ADD COLUMN approval_status VARCHAR(20) NOT NULL DEFAULT 'Approved' AFTER status"
        )

    conn.commit()
    cursor.close()
    conn.close()


def get_admin_overview() -> dict:
    try:
        ensure_admin_columns()
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """SELECT
                    COUNT(*) AS total_users,
                    SUM(CASE WHEN user_type = 'buyer' THEN 1 ELSE 0 END) AS total_buyers,
                    SUM(CASE WHEN user_type = 'farmer' THEN 1 ELSE 0 END) AS total_farmers,
                    SUM(CASE WHEN user_type = 'farmer' AND approval_status = 'Pending' THEN 1 ELSE 0 END) AS pending_farmers
               FROM users"""
        )
        users = cursor.fetchone() or {}

        cursor.execute(
            """SELECT
                    COUNT(*) AS total_products,
                    SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active_products,
                    SUM(CASE WHEN approval_status = 'Pending' THEN 1 ELSE 0 END) AS pending_products
               FROM products"""
        )
        products = cursor.fetchone() or {}

        cursor.execute(
            """SELECT
                    COUNT(*) AS total_orders,
                    SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) AS today_orders,
                    COALESCE(SUM(amount), 0) AS total_revenue,
                    SUM(CASE WHEN payment_status = 'PENDING' THEN 1 ELSE 0 END) AS pending_payments
               FROM orders"""
        )
        orders = cursor.fetchone() or {}

        cursor.close()
        conn.close()
        return {
            "success": True,
            "overview": {
                "total_users": int(users.get("total_users") or 0),
                "total_buyers": int(users.get("total_buyers") or 0),
                "total_farmers": int(users.get("total_farmers") or 0),
                "pending_farmers": int(users.get("pending_farmers") or 0),
                "total_products": int(products.get("total_products") or 0),
                "active_products": int(products.get("active_products") or 0),
                "pending_products": int(products.get("pending_products") or 0),
                "total_orders": int(orders.get("total_orders") or 0),
                "today_orders": int(orders.get("today_orders") or 0),
                "pending_payments": int(orders.get("pending_payments") or 0),
                "total_revenue": float(orders.get("total_revenue") or 0),
            },
        }
    except Error as e:
        return {"success": False, "message": str(e), "overview": None}


def list_users(user_type: str = "", account_status: str = "", q: str = "") -> dict:
    try:
        ensure_admin_columns()
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        clauses = []
        values = []

        if user_type:
            clauses.append("u.user_type = %s")
            values.append(user_type)
        if account_status:
            clauses.append("u.account_status = %s")
            values.append(account_status)
        if q:
            clauses.append("(u.name LIKE %s OR u.email LIKE %s OR u.phone LIKE %s)")
            like = f"%{q}%"
            values.extend([like, like, like])

        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        cursor.execute(
            f"""SELECT u.id, u.name, u.email, u.phone, u.user_type, u.account_status, u.approval_status, u.created_at
                FROM users u
                {where}
                ORDER BY u.created_at DESC""",
            tuple(values),
        )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"success": True, "users": rows}
    except Error as e:
        return {"success": False, "message": str(e), "users": []}


def set_user_status(user_id: int, status: str) -> dict:
    try:
        ensure_admin_columns()
        if status not in {"Active", "Blocked"}:
            return {"success": False, "message": "Invalid status"}
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET account_status = %s WHERE id = %s",
            (status, user_id),
        )
        conn.commit()
        updated = cursor.rowcount
        cursor.close()
        conn.close()
        if updated == 0:
            return {"success": False, "message": "User not found"}
        return {"success": True, "message": "User status updated"}
    except Error as e:
        return {"success": False, "message": str(e)}


def list_farmers(approval_status: str = "") -> dict:
    try:
        ensure_admin_columns()
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        if approval_status:
            cursor.execute(
                """SELECT id, name, email, phone, user_type, account_status, approval_status, created_at
                   FROM users
                   WHERE user_type = 'farmer' AND approval_status = %s
                   ORDER BY created_at DESC""",
                (approval_status,),
            )
        else:
            cursor.execute(
                """SELECT id, name, email, phone, user_type, account_status, approval_status, created_at
                   FROM users
                   WHERE user_type = 'farmer'
                   ORDER BY created_at DESC"""
            )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"success": True, "farmers": rows}
    except Error as e:
        return {"success": False, "message": str(e), "farmers": []}


def set_farmer_approval(user_id: int, approval_status: str) -> dict:
    try:
        ensure_admin_columns()
        if approval_status not in {"Pending", "Approved", "Rejected"}:
            return {"success": False, "message": "Invalid approval_status"}
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET approval_status = %s, account_status = %s WHERE id = %s AND user_type = 'farmer'",
            (approval_status, "Active" if approval_status == "Approved" else "Blocked", user_id),
        )
        conn.commit()
        updated = cursor.rowcount
        cursor.close()
        conn.close()
        if updated == 0:
            return {"success": False, "message": "Farmer not found"}
        return {"success": True, "message": "Farmer approval updated"}
    except Error as e:
        return {"success": False, "message": str(e)}


def list_products(approval_status: str = "", status: str = "") -> dict:
    try:
        ensure_admin_columns()
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        clauses = []
        values = []
        if approval_status:
            clauses.append("p.approval_status = %s")
            values.append(approval_status)
        if status:
            clauses.append("p.status = %s")
            values.append(status)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        cursor.execute(
            f"""SELECT p.id, p.name, p.category, p.quality, p.price, p.unit, p.available_quantity,
                      p.status, p.approval_status, p.created_at, p.farmer_id, u.name AS farmer_name
               FROM products p
               JOIN users u ON u.id = p.farmer_id
               {where}
               ORDER BY p.created_at DESC""",
            tuple(values),
        )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"success": True, "products": rows}
    except Error as e:
        return {"success": False, "message": str(e), "products": []}


def set_product_approval(product_id: int, approval_status: str) -> dict:
    try:
        ensure_admin_columns()
        if approval_status not in {"Pending", "Approved", "Rejected"}:
            return {"success": False, "message": "Invalid approval_status"}
        status = "Active" if approval_status == "Approved" else "Inactive"
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE products SET approval_status = %s, status = %s WHERE id = %s",
            (approval_status, status, product_id),
        )
        conn.commit()
        updated = cursor.rowcount
        cursor.close()
        conn.close()
        if updated == 0:
            return {"success": False, "message": "Product not found"}
        return {"success": True, "message": "Product approval updated"}
    except Error as e:
        return {"success": False, "message": str(e)}


def list_orders(status: str = "", limit: int = 50) -> dict:
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        if status:
            cursor.execute(
                """SELECT o.id, o.status, o.amount, o.quantity, o.payment_method, o.payment_status, o.created_at,
                          b.name AS buyer_name, f.name AS farmer_name, p.name AS product_name
                   FROM orders o
                   JOIN users b ON b.id = o.buyer_id
                   JOIN users f ON f.id = o.farmer_id
                   JOIN products p ON p.id = o.product_id
                   WHERE o.status = %s
                   ORDER BY o.created_at DESC
                   LIMIT %s""",
                (status, max(1, min(limit, 500))),
            )
        else:
            cursor.execute(
                """SELECT o.id, o.status, o.amount, o.quantity, o.payment_method, o.payment_status, o.created_at,
                          b.name AS buyer_name, f.name AS farmer_name, p.name AS product_name
                   FROM orders o
                   JOIN users b ON b.id = o.buyer_id
                   JOIN users f ON f.id = o.farmer_id
                   JOIN products p ON p.id = o.product_id
                   ORDER BY o.created_at DESC
                   LIMIT %s""",
                (max(1, min(limit, 500)),),
            )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"success": True, "orders": rows}
    except Error as e:
        return {"success": False, "message": str(e), "orders": []}


def list_payments(payment_status: str = "", method: str = "", limit: int = 50) -> dict:
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        clauses = []
        values = []
        if payment_status:
            clauses.append("o.payment_status = %s")
            values.append(payment_status)
        if method:
            clauses.append("o.payment_method = %s")
            values.append(method)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        values.append(max(1, min(limit, 500)))
        cursor.execute(
            f"""SELECT o.id AS order_id, o.amount, o.payment_method, o.payment_status, o.transaction_id, o.created_at,
                      b.name AS buyer_name
               FROM orders o
               JOIN users b ON b.id = o.buyer_id
               {where}
               ORDER BY o.created_at DESC
               LIMIT %s""",
            tuple(values),
        )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"success": True, "payments": rows}
    except Error as e:
        return {"success": False, "message": str(e), "payments": []}


def get_reports_summary() -> dict:
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """SELECT DATE(created_at) AS report_date, COUNT(*) AS orders, COALESCE(SUM(amount), 0) AS revenue
               FROM orders
               WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
               GROUP BY DATE(created_at)
               ORDER BY report_date DESC"""
        )
        daily = cursor.fetchall()

        cursor.execute(
            """SELECT p.name, COUNT(*) AS order_count
               FROM orders o
               JOIN products p ON p.id = o.product_id
               GROUP BY p.id, p.name
               ORDER BY order_count DESC
               LIMIT 10"""
        )
        top_products = cursor.fetchall()

        cursor.close()
        conn.close()
        return {"success": True, "daily_sales": daily, "top_products": top_products}
    except Error as e:
        return {"success": False, "message": str(e), "daily_sales": [], "top_products": []}
