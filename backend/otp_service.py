"""OTP service for contact verification."""

from __future__ import annotations

import os
import re
import secrets
import json
import base64
import smtplib
import urllib.parse
import urllib.request
import urllib.error
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4
from pathlib import Path
from email.message import EmailMessage


OTP_TTL_SECONDS = 300
VERIFICATION_TTL_SECONDS = 600

_otp_store: dict[str, dict[str, Any]] = {}
_verification_store: dict[str, dict[str, Any]] = {}
_file_config_cache: dict[str, str] | None = None


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize(identifier_type: str, identifier: str) -> str:
    kind = identifier_type.strip().lower()
    value = identifier.strip()

    if kind == "email":
        return f"email:{value.lower()}"

    if kind == "phone":
        compact = re.sub(r"[\s()-]", "", value)
        return f"phone:{compact}"

    raise ValueError("identifier_type must be 'email' or 'phone'")


def _cleanup_expired() -> None:
    now = _now()

    expired_otp = [k for k, v in _otp_store.items() if v["expires_at"] <= now]
    for key in expired_otp:
        _otp_store.pop(key, None)

    expired_verification = [k for k, v in _verification_store.items() if v["expires_at"] <= now]
    for key in expired_verification:
        _verification_store.pop(key, None)


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


def _normalize_phone_for_sms(phone_number: str) -> str:
    """
    Normalize Sri Lanka phone inputs into E.164 format.
    Accepted:
    - 0771234567
    - 94771234567
    - +94771234567
    """
    compact = re.sub(r"[\s()-]", "", phone_number.strip())
    if compact.startswith("+"):
        compact = "+" + re.sub(r"\D", "", compact[1:])
    else:
        compact = re.sub(r"\D", "", compact)

    if compact.startswith("+94") and len(compact) == 12:
        return compact
    if compact.startswith("94") and len(compact) == 11:
        return f"+{compact}"
    if compact.startswith("0") and len(compact) == 10:
        return f"+94{compact[1:]}"

    raise ValueError("Enter a valid Sri Lanka mobile number (e.g., 0771234567 or +94771234567)")


def _twilio_enabled() -> bool:
    return all(
        [
            _cfg("TWILIO_ACCOUNT_SID"),
            _cfg("TWILIO_AUTH_TOKEN"),
            _cfg("TWILIO_FROM_NUMBER"),
        ]
    )


def _notifylk_enabled() -> bool:
    return all(
        [
            _cfg("NOTIFYLK_USER_ID"),
            _cfg("NOTIFYLK_API_KEY"),
            _cfg("NOTIFYLK_SENDER_ID"),
        ]
    )


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


def _send_email_via_smtp(recipient_email: str, otp: str) -> tuple[bool, str]:
    smtp_host = _cfg("SMTP_HOST")
    smtp_port = int(_cfg("SMTP_PORT", "587"))
    smtp_username = _cfg("SMTP_USERNAME")
    smtp_password = _cfg("SMTP_PASSWORD")
    email_from = _cfg("EMAIL_FROM")
    use_tls = _cfg("SMTP_USE_TLS", "1").strip() != "0"

    subject = "Your Fresh AI Trade OTP Code"
    body = f"Your Fresh AI Trade OTP is {otp}. It expires in 5 minutes."

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = email_from
    message["To"] = recipient_email.strip()
    message.set_content(body)

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as smtp:
            smtp.ehlo()
            if use_tls:
                smtp.starttls()
                smtp.ehlo()
            smtp.login(smtp_username, smtp_password)
            smtp.send_message(message)
        return True, "Email sent"
    except Exception as exc:
        return False, f"Email delivery failed: {exc}"


def _send_sms_via_notifylk(phone_number: str, otp: str) -> tuple[bool, str]:
    user_id = _cfg("NOTIFYLK_USER_ID")
    api_key = _cfg("NOTIFYLK_API_KEY")
    sender_id = _cfg("NOTIFYLK_SENDER_ID")
    message = f"Your Fresh AI Trade OTP is {otp}. Expires in 5 minutes."

    notifylk_to = phone_number[1:] if phone_number.startswith("+") else phone_number

    query = urllib.parse.urlencode(
        {
            "user_id": user_id,
            "api_key": api_key,
            "sender_id": sender_id,
            "to": notifylk_to,
            "message": message,
        }
    )
    req = urllib.request.Request(
        url=f"https://app.notify.lk/api/v1/send?{query}",
        method="GET",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            raw = response.read().decode("utf-8")
            parsed = json.loads(raw)
            if str(parsed.get("status")) == "success":
                return True, "SMS sent"
            return False, parsed.get("message", "NotifyLK delivery failed")
    except urllib.error.HTTPError as exc:
        try:
            body = exc.read().decode("utf-8")
        except Exception:
            body = ""
        if body:
            return False, f"NotifyLK delivery failed: {body}"
        return False, f"NotifyLK delivery failed: HTTP {exc.code}"
    except Exception as exc:
        return False, f"NotifyLK delivery failed: {exc}"


def _send_sms_via_twilio(phone_number: str, otp: str) -> tuple[bool, str]:
    account_sid = _cfg("TWILIO_ACCOUNT_SID")
    auth_token = _cfg("TWILIO_AUTH_TOKEN")
    from_number = _cfg("TWILIO_FROM_NUMBER")

    body = f"Your Fresh AI Trade OTP is {otp}. It expires in 5 minutes."
    payload = urllib.parse.urlencode(
        {
            "To": phone_number,
            "From": from_number,
            "Body": body,
        }
    ).encode("utf-8")

    credentials = base64.b64encode(f"{account_sid}:{auth_token}".encode("utf-8")).decode("utf-8")
    req = urllib.request.Request(
        url=f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json",
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            raw = response.read().decode("utf-8")
            parsed = json.loads(raw)
            sid = parsed.get("sid")
            return True, f"SMS sent (sid: {sid})" if sid else "SMS sent"
    except Exception as exc:
        return False, f"SMS delivery failed: {exc}"


def send_otp(identifier_type: str, identifier: str) -> dict[str, Any]:
    _cleanup_expired()
    key = _normalize(identifier_type, identifier)

    otp = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = _now() + timedelta(seconds=OTP_TTL_SECONDS)
    _otp_store[key] = {
        "otp": otp,
        "expires_at": expires_at,
    }

    id_type = identifier_type.strip().lower()
    if id_type == "phone":
        try:
            normalized_phone = _normalize_phone_for_sms(identifier)
        except ValueError as exc:
            return {"success": False, "message": str(exc)}

        provider = _cfg("SMS_PROVIDER", "notifylk").strip().lower()

        if provider == "notifylk":
            if not _notifylk_enabled():
                return {
                    "success": False,
                    "message": "NotifyLK is not configured. Set NOTIFYLK_USER_ID, NOTIFYLK_API_KEY, NOTIFYLK_SENDER_ID",
                }
            ok, sms_message = _send_sms_via_notifylk(normalized_phone, otp)
        elif provider == "twilio":
            if not _twilio_enabled():
                return {
                    "success": False,
                    "message": "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER",
                }
            ok, sms_message = _send_sms_via_twilio(normalized_phone, otp)
        else:
            return {"success": False, "message": "Unsupported SMS_PROVIDER. Use 'notifylk' or 'twilio'"}

        if not ok:
            return {"success": False, "message": sms_message}
        return {
            "success": True,
            "message": sms_message,
            "expires_in": OTP_TTL_SECONDS,
        }

    if id_type == "email":
        if not _email_enabled():
            return {
                "success": False,
                "message": "Email delivery is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, EMAIL_FROM",
            }
        ok, email_message = _send_email_via_smtp(identifier, otp)
        if not ok:
            return {"success": False, "message": email_message}
        return {
            "success": True,
            "message": email_message,
            "expires_in": OTP_TTL_SECONDS,
        }

    return {"success": False, "message": "identifier_type must be 'email' or 'phone'"}


def verify_otp(identifier_type: str, identifier: str, otp: str) -> dict[str, Any]:
    _cleanup_expired()
    key = _normalize(identifier_type, identifier)
    stored = _otp_store.get(key)

    if not stored:
        return {"success": False, "message": "OTP not found or expired"}

    if stored["otp"] != str(otp).strip():
        return {"success": False, "message": "Invalid OTP code"}

    token = str(uuid4())
    _verification_store[token] = {
        "key": key,
        "expires_at": _now() + timedelta(seconds=VERIFICATION_TTL_SECONDS),
    }
    _otp_store.pop(key, None)

    return {
        "success": True,
        "message": "OTP verified successfully",
        "verification_token": token,
        "expires_in": VERIFICATION_TTL_SECONDS,
    }


def consume_verification_token(identifier_type: str, identifier: str, token: str) -> bool:
    _cleanup_expired()
    key = _normalize(identifier_type, identifier)
    item = _verification_store.get(str(token).strip())
    if not item:
        return False

    if item["key"] != key:
        return False

    _verification_store.pop(str(token).strip(), None)
    return True


def validate_verification_token(identifier_type: str, identifier: str, token: str) -> bool:
    """Check verification token validity without consuming it."""
    _cleanup_expired()
    key = _normalize(identifier_type, identifier)
    item = _verification_store.get(str(token).strip())
    if not item:
        return False
    return item["key"] == key
