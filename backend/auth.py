"""
Authentication functions for login and register.
Handles user registration and login with password hashing.
"""

import bcrypt
import re
from database import get_connection
from mysql.connector import Error


def _ensure_user_admin_columns(cursor) -> None:
    """Ensure user moderation columns exist before auth queries."""
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


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against bcrypt hash; fallback to plain-text for legacy rows."""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except ValueError:
        # Temporary compatibility for old records that stored plain-text passwords.
        return password == hashed


def _is_valid_email(email: str) -> bool:
    """Validate a standard email format."""
    pattern = r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
    return bool(re.fullmatch(pattern, email.strip(), flags=re.IGNORECASE))


def _is_valid_phone(phone: str) -> bool:
    """
    Validate phone as digits with optional leading '+'.
    Allows 10 to 15 digits.
    """
    normalized = re.sub(r"[\s()-]", "", phone.strip())
    return bool(re.fullmatch(r"^\+?\d{10,15}$", normalized))


def register_user(name: str, email: str, phone: str, password: str, user_type: str) -> dict:
    """
    Register a new user.
    Returns: {"success": bool, "message": str, "user_id": int or None}
    """
    try:
        name = name.strip()
        email = (email or "").strip().lower()
        phone = (phone or "").strip()

        if not email and not phone:
            return {"success": False, "message": "Email or phone number is required", "user_id": None}

        if email and not _is_valid_email(email):
            return {"success": False, "message": "Please enter a valid email address", "user_id": None}

        if phone and not _is_valid_phone(phone):
            return {"success": False, "message": "Please enter a valid phone number (10-15 digits)", "user_id": None}

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        _ensure_user_admin_columns(cursor)

        # Check if email already exists
        if email:
            cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
            existing_user = cursor.fetchone()
            if existing_user:
                cursor.close()
                conn.close()
                return {"success": False, "message": "Email already registered", "user_id": None}

        # Check if phone already exists
        if phone:
            cursor.execute("SELECT id FROM users WHERE phone = %s", (phone,))
            existing_phone = cursor.fetchone()
            if existing_phone:
                cursor.close()
                conn.close()
                return {"success": False, "message": "Phone number already registered", "user_id": None}

        # Validate user_type
        valid_types = ['farmer', 'buyer', 'admin']
        if user_type not in valid_types:
            cursor.close()
            conn.close()
            return {"success": False, "message": f"Invalid user type. Must be one of: {', '.join(valid_types)}", "user_id": None}

        # Hash password
        password_hash = hash_password(password)

        # Insert new user
        approval_status = "Pending" if user_type == "farmer" else "Approved"
        cursor.execute(
            """INSERT INTO users (name, email, phone, password_hash, user_type, account_status, approval_status)
               VALUES (%s, %s, %s, %s, %s, 'Active', %s)""",
            (name, email if email else None, phone if phone else None, password_hash, user_type, approval_status)
        )
        user_id = cursor.lastrowid
        conn.commit()

        cursor.close()
        conn.close()

        return {
            "success": True,
            "message": f"Account created successfully as {user_type}",
            "user_id": user_id,
            "user_type": user_type
        }

    except Error as e:
        return {"success": False, "message": f"Database error: {str(e)}", "user_id": None}


def login_user(email: str, password: str, user_type: str = None) -> dict:
    """
    Authenticate a user login.
    Returns: {"success": bool, "message": str, "user": dict or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        _ensure_user_admin_columns(cursor)

        # Query user by email
        if user_type:
            cursor.execute(
                "SELECT id, name, email, phone, password_hash, user_type, account_status, approval_status FROM users WHERE email = %s AND user_type = %s",
                (email, user_type)
            )
        else:
            cursor.execute(
                "SELECT id, name, email, phone, password_hash, user_type, account_status, approval_status FROM users WHERE email = %s",
                (email,)
            )

        user = cursor.fetchone()
        cursor.close()
        conn.close()

        if not user:
            return {"success": False, "message": "Invalid email or password", "user": None}

        # Verify password
        if not verify_password(password, user['password_hash']):
            return {"success": False, "message": "Invalid email or password", "user": None}

        if (user.get("account_status") or "Active") != "Active":
            return {"success": False, "message": "Account is blocked. Contact admin.", "user": None}

        if user.get("user_type") == "farmer" and (user.get("approval_status") or "Pending") != "Approved":
            return {"success": False, "message": "Farmer account pending admin approval", "user": None}

        # Return user data (without password hash)
        user_data = {
            "id": user['id'],
            "name": user['name'],
            "email": user['email'],
            "phone": user['phone'],
            "user_type": user['user_type']
        }

        return {
            "success": True,
            "message": f"Logged in as {user['user_type']}",
            "user": user_data
        }

    except Error as e:
        return {"success": False, "message": f"Database error: {str(e)}", "user": None}
