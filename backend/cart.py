"""
Cart and checkout for buyers.
"""

from uuid import uuid4

from database import get_connection
from mysql.connector import Error
from notifications import send_order_confirmation_email


def _ensure_payment_columns(cursor) -> None:
    """Ensure payment columns exist on orders table."""
    cursor.execute("SHOW COLUMNS FROM orders LIKE 'payment_method'")
    if not cursor.fetchone():
        cursor.execute(
            "ALTER TABLE orders ADD COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT 'COD' AFTER amount"
        )

    cursor.execute("SHOW COLUMNS FROM orders LIKE 'payment_status'")
    if not cursor.fetchone():
        cursor.execute(
            "ALTER TABLE orders ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' AFTER payment_method"
        )

    cursor.execute("SHOW COLUMNS FROM orders LIKE 'transaction_id'")
    if not cursor.fetchone():
        cursor.execute(
            "ALTER TABLE orders ADD COLUMN transaction_id VARCHAR(64) NULL AFTER payment_status"
        )


def _format_order_ref(order_id: int) -> str:
    return f"FM{order_id:05d}"


def _new_transaction_id() -> str:
    return f"TXN{uuid4().hex[:10].upper()}"


def get_cart_count(buyer_id: int) -> dict:
    """Get number of items in cart. Returns: {"success": bool, "count": int}"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COALESCE(SUM(quantity), 0) FROM cart_items WHERE buyer_id = %s",
            (buyer_id,)
        )
        row = cursor.fetchone()
        count = int(row[0]) if row else 0
        cursor.close()
        conn.close()
        return {"success": True, "count": count}
    except Error as e:
        return {"success": False, "message": str(e), "count": 0}


def get_cart(buyer_id: int) -> dict:
    """
    Get cart items with product details for a buyer.
    Returns: {"success": bool, "items": list or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """SELECT c.id AS cart_item_id, c.product_id, c.quantity AS cart_quantity,
                      p.name, p.category, p.quality, p.price, p.unit, p.available_quantity,
                      p.image_url, p.farmer_id, u.name AS farmer_name
               FROM cart_items c
               JOIN products p ON c.product_id = p.id
               JOIN users u ON p.farmer_id = u.id
               WHERE c.buyer_id = %s
               ORDER BY c.created_at DESC""",
            (buyer_id,)
        )
        items = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"success": True, "items": items}
    except Error as e:
        return {"success": False, "message": str(e), "items": None}


def add_to_cart(buyer_id: int, product_id: int, quantity: float) -> dict:
    """
    Add or update quantity in cart.
    Returns: {"success": bool, "message": str}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT available_quantity FROM products WHERE id = %s AND status = 'Active'",
            (product_id,)
        )
        product = cursor.fetchone()
        if not product:
            cursor.close()
            conn.close()
            return {"success": False, "message": "Product not found or not available"}

        cursor.execute(
            "SELECT quantity FROM cart_items WHERE buyer_id = %s AND product_id = %s",
            (buyer_id, product_id)
        )
        existing = cursor.fetchone()
        new_qty = quantity if not existing else existing["quantity"] + quantity

        if new_qty > product["available_quantity"]:
            cursor.close()
            conn.close()
            return {"success": False, "message": f"Only {product['available_quantity']} available"}

        if existing:
            cursor.execute(
                "UPDATE cart_items SET quantity = quantity + %s WHERE buyer_id = %s AND product_id = %s",
                (quantity, buyer_id, product_id)
            )
        else:
            cursor.execute(
                "INSERT INTO cart_items (buyer_id, product_id, quantity) VALUES (%s, %s, %s)",
                (buyer_id, product_id, quantity)
            )
        conn.commit()
        cursor.close()
        conn.close()
        return {"success": True, "message": "Added to cart"}
    except Error as e:
        return {"success": False, "message": str(e)}


def update_cart_item(buyer_id: int, product_id: int, quantity: float) -> dict:
    """
    Set quantity for a cart item. Remove if quantity <= 0.
    Returns: {"success": bool, "message": str}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        if quantity <= 0:
            cursor.execute("DELETE FROM cart_items WHERE buyer_id = %s AND product_id = %s", (buyer_id, product_id))
            conn.commit()
            cursor.close()
            conn.close()
            return {"success": True, "message": "Removed from cart"}

        cursor.execute(
            "SELECT available_quantity FROM products WHERE id = %s",
            (product_id,)
        )
        product = cursor.fetchone()
        if not product or quantity > product["available_quantity"]:
            cursor.close()
            conn.close()
            return {"success": False, "message": "Invalid quantity or product"}

        cursor.execute(
            "UPDATE cart_items SET quantity = %s WHERE buyer_id = %s AND product_id = %s",
            (quantity, buyer_id, product_id)
        )
        if cursor.rowcount == 0:
            cursor.execute(
                "INSERT INTO cart_items (buyer_id, product_id, quantity) VALUES (%s, %s, %s)",
                (buyer_id, product_id, quantity)
            )
        conn.commit()
        cursor.close()
        conn.close()
        return {"success": True, "message": "Cart updated"}
    except Error as e:
        return {"success": False, "message": str(e)}


def remove_from_cart(buyer_id: int, product_id: int) -> dict:
    """Remove item from cart. Returns: {"success": bool, "message": str}"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM cart_items WHERE buyer_id = %s AND product_id = %s", (buyer_id, product_id))
        conn.commit()
        cursor.close()
        conn.close()
        return {"success": True, "message": "Removed from cart"}
    except Error as e:
        return {"success": False, "message": str(e)}


def checkout(buyer_id: int, payment_method: str = "COD") -> dict:
    """
    Create orders from cart and clear cart.
    Returns order summary for confirmation UI/email.
    """
    try:
        method = (payment_method or "COD").strip().upper()
        allowed_methods = {"COD", "ONLINE"}
        if method not in allowed_methods:
            return {"success": False, "message": "Unsupported payment method", "order_ids": []}

        payment_status = "PENDING" if method == "COD" else "PAID"
        transaction_id = _new_transaction_id() if method == "ONLINE" else None

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        _ensure_payment_columns(cursor)

        cursor.execute(
            "SELECT name, email FROM users WHERE id = %s",
            (buyer_id,),
        )
        buyer = cursor.fetchone() or {}

        cursor.execute(
            """SELECT c.product_id, c.quantity, p.name, p.price, p.farmer_id
               FROM cart_items c
               JOIN products p ON c.product_id = p.id
               WHERE c.buyer_id = %s""",
            (buyer_id,)
        )
        items = cursor.fetchall()
        if not items:
            cursor.close()
            conn.close()
            return {"success": False, "message": "Cart is empty", "order_ids": []}

        order_ids = []
        total_amount = 0.0
        order_items: list[dict] = []
        for row in items:
            amount = float(row["quantity"]) * float(row["price"])
            total_amount += amount
            order_items.append(
                {
                    "name": row["name"],
                    "quantity": float(row["quantity"]),
                    "price": float(row["price"]),
                }
            )
            cursor.execute(
                """INSERT INTO orders (buyer_id, product_id, farmer_id, quantity, amount, payment_method, payment_status, transaction_id, status)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'Pending')""",
                (
                    buyer_id,
                    row["product_id"],
                    row["farmer_id"],
                    row["quantity"],
                    amount,
                    method,
                    payment_status,
                    transaction_id,
                ),
            )
            order_ids.append(cursor.lastrowid)
            cursor.execute(
                "UPDATE products SET available_quantity = available_quantity - %s WHERE id = %s",
                (row["quantity"], row["product_id"])
            )

        cursor.execute("DELETE FROM cart_items WHERE buyer_id = %s", (buyer_id,))
        conn.commit()
        cursor.close()
        conn.close()

        order_refs = [_format_order_ref(oid) for oid in order_ids]
        send_order_confirmation_email(
            to_email=buyer.get("email"),
            buyer_name=buyer.get("name") or "Buyer",
            order_refs=order_refs,
            payment_method=method,
            payment_status=payment_status,
            total_amount=total_amount,
            items=order_items,
            transaction_id=transaction_id,
        )

        return {
            "success": True,
            "message": "Order placed successfully",
            "order_ids": order_ids,
            "order_references": order_refs,
            "payment_method": method,
            "payment_status": payment_status,
            "total_amount": round(total_amount, 2),
            "transaction_id": transaction_id,
        }
    except Error as e:
        return {"success": False, "message": str(e), "order_ids": []}


def buy_now(buyer_id: int, product_id: int, quantity: float, payment_method: str = "COD") -> dict:
    """
    Create one order directly without using cart.
    Returns order summary for confirmation UI/email.
    """
    try:
        method = (payment_method or "COD").strip().upper()
        allowed_methods = {"COD", "ONLINE"}
        if method not in allowed_methods:
            return {"success": False, "message": "Unsupported payment method", "order_id": None}

        if quantity <= 0:
            return {"success": False, "message": "Quantity must be greater than 0", "order_id": None}

        payment_status = "PENDING" if method == "COD" else "PAID"
        transaction_id = _new_transaction_id() if method == "ONLINE" else None

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        _ensure_payment_columns(cursor)

        cursor.execute(
            "SELECT name, email FROM users WHERE id = %s",
            (buyer_id,),
        )
        buyer = cursor.fetchone() or {}

        cursor.execute(
            """SELECT id, farmer_id, name, price, available_quantity, status
               FROM products
               WHERE id = %s""",
            (product_id,),
        )
        product = cursor.fetchone()
        if not product:
            cursor.close()
            conn.close()
            return {"success": False, "message": "Product not found", "order_id": None}

        if product["status"] != "Active":
            cursor.close()
            conn.close()
            return {"success": False, "message": "Product is not available", "order_id": None}

        if float(quantity) > float(product["available_quantity"]):
            cursor.close()
            conn.close()
            return {
                "success": False,
                "message": f"Only {product['available_quantity']} available",
                "order_id": None,
            }

        amount = float(quantity) * float(product["price"])
        cursor.execute(
            """INSERT INTO orders (buyer_id, product_id, farmer_id, quantity, amount, payment_method, payment_status, transaction_id, status)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'Pending')""",
            (
                buyer_id,
                product_id,
                product["farmer_id"],
                quantity,
                amount,
                method,
                payment_status,
                transaction_id,
            ),
        )
        order_id = cursor.lastrowid
        cursor.execute(
            "UPDATE products SET available_quantity = available_quantity - %s WHERE id = %s",
            (quantity, product_id),
        )
        conn.commit()
        cursor.close()
        conn.close()

        order_ref = _format_order_ref(order_id)
        send_order_confirmation_email(
            to_email=buyer.get("email"),
            buyer_name=buyer.get("name") or "Buyer",
            order_refs=[order_ref],
            payment_method=method,
            payment_status=payment_status,
            total_amount=amount,
            items=[{"name": product["name"], "quantity": float(quantity), "price": float(product["price"])}],
            transaction_id=transaction_id,
        )

        return {
            "success": True,
            "message": "Order placed successfully",
            "order_id": order_id,
            "order_reference": order_ref,
            "payment_method": method,
            "payment_status": payment_status,
            "total_amount": round(amount, 2),
            "transaction_id": transaction_id,
        }
    except Error as e:
        return {"success": False, "message": str(e), "order_id": None}
