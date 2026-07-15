from itsdangerous import TimestampSigner, BadSignature
from app.core.config import settings


signer = TimestampSigner(settings.session_secret)
MAX_AGE_SECONDS = 86400 * 7  # 7 days


def sign_user_id(user_id: str) -> str:
    """Sign a user ID into a session token."""
    return signer.sign(user_id).decode() if isinstance(signer.sign(user_id), bytes) else signer.sign(user_id)


def verify_user_id(token: str, max_age: int = MAX_AGE_SECONDS) -> str:
    """Verify and extract user ID from a session token."""
    try:
        return signer.unsign(token, max_age=max_age)
    except BadSignature:
        raise ValueError("Invalid or expired session token")


def set_session_cookie_params() -> dict:
    """Return cookie parameters based on environment."""
    return {
        "secure": settings.cookie_secure,
        "samesite": settings.cookie_samesite,
        "httponly": True,
        "max_age": MAX_AGE_SECONDS,
    }
