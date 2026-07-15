from cryptography.fernet import Fernet
import base64
import hashlib
from app.core.config import settings


def derive_key() -> bytes:
    """Derive a consistent encryption key from SESSION_SECRET."""
    hashed = hashlib.sha256(settings.session_secret.encode()).digest()
    return base64.urlsafe_b64encode(hashed)


_cipher = Fernet(derive_key())


def encrypt_token(token: str) -> str:
    """Encrypt a token (access or refresh token)."""
    return _cipher.encrypt(token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    """Decrypt a token."""
    return _cipher.decrypt(encrypted_token.encode()).decode()
