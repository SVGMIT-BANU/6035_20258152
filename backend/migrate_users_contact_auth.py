"""
Migration: allow registering with email OR phone and enforce unique phone.

Run:
    python backend/migrate_users_contact_auth.py
"""

from database import get_connection


def run_migration() -> None:
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("ALTER TABLE users MODIFY email VARCHAR(255) NULL")
    cursor.execute("ALTER TABLE users MODIFY phone VARCHAR(50) NULL")

    cursor.execute("""
        SELECT COUNT(*) 
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND INDEX_NAME = 'unique_phone'
    """)
    exists = cursor.fetchone()[0]
    if not exists:
        cursor.execute("ALTER TABLE users ADD UNIQUE KEY unique_phone (phone)")

    conn.commit()
    cursor.close()
    conn.close()
    print("Migration completed: users.email nullable, users.phone nullable+unique")


if __name__ == "__main__":
    run_migration()
