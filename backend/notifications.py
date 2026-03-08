"""
Order notification helpers (email).
"""

from __future__ import annotations

import json
import os
import smtplib
from email.message import EmailMessage
from pathlib import Path
from typing import Any


_file_config_cache: dict[str, str] | None = None


def _load_file_config() -> dict[str, str]:
    global _file_config_cache
    if _file_config_cache is not None:
        return _file_config_cache

    config_path = Path(__file__).resolve().parent / "sms_config.json"
    if not config_path.exists():
        _file_config_cache = {}
        return _file_config_cache

    try:
        parsed = json.loads(config_path.read_text(encoding="utf-8"))
        _file_config_cache = {str(k): str(v) for k, v in parsed.items()}
    except Exception:
        _file_config_cache = {}
    return _file_config_cache


def _cfg(name: str, default: str = "") -> str:
    return os.getenv(name) or _load_file_config().get(name, default)


def _email_enabled() -> bool:
    return all(
        [
            _cfg("SMTP_HOST"),
            _cfg("SMTP_PORT"),
            _cfg("SMTP_USERNAME"),
            _cfg("SMTP_PASSWORD"),
            _cfg("EMAIL_FROM"),
        ]
    )


def send_order_confirmation_email(
    to_email: str | None,
    buyer_name: str,
    order_refs: list[str],
    payment_method: str,
    payment_status: str,
    total_amount: float,
    items: list[dict[str, Any]],
    transaction_id: str | None = None,
) -> tuple[bool, str]:
    if not to_email:
        return False, "Buyer email not available"
    if not _email_enabled():
        return False, "SMTP not configured"

    smtp_host = _cfg("SMTP_HOST")
    smtp_port = int(_cfg("SMTP_PORT", "587"))
    smtp_username = _cfg("SMTP_USERNAME")
    smtp_password = _cfg("SMTP_PASSWORD")
    email_from = _cfg("EMAIL_FROM")
    use_tls = _cfg("SMTP_USE_TLS", "1").strip() != "0"

    item_lines = []
    for item in items:
        item_lines.append(
            f"- {item.get('name', 'Item')} x {item.get('quantity')} @ LKR {item.get('price')}"
        )

    body_lines = [
        f"Dear {buyer_name},",
        "",
        "Your FreshMarket order has been placed successfully.",
        "",
        f"Order ID(s): {', '.join(order_refs)}",
        f"Payment Method: {payment_method}",
        f"Payment Status: {payment_status}",
        f"Total Amount: LKR {total_amount:.2f}",
    ]
    if transaction_id:
        body_lines.append(f"Transaction ID: {transaction_id}")
    if payment_method == "COD":
        body_lines.append(f"Please keep LKR {total_amount:.2f} ready at delivery time.")
    body_lines.extend(["", "Items:"])
    body_lines.extend(item_lines if item_lines else ["- (No items)"])
    body_lines.extend(["", "Thank you for shopping with us."])

    msg = EmailMessage()
    msg["Subject"] = "Your FreshMarket Order Confirmation"
    msg["From"] = email_from
    msg["To"] = to_email
    msg.set_content("\n".join(body_lines))

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as smtp:
            smtp.ehlo()
            if use_tls:
                smtp.starttls()
                smtp.ehlo()
            smtp.login(smtp_username, smtp_password)
            smtp.send_message(msg)
        return True, "Email sent"
    except Exception as exc:
        return False, f"Email failed: {exc}"
