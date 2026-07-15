from fastapi import Cookie, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.db.models import User
from app.core.session import verify_user_id
from app.core.security import decrypt_token
from app.services.spotify_service import refresh_access_token
from datetime import datetime, timedelta


def get_current_user(session_id: str | None = Cookie(None), db: Session = Depends(get_db)) -> User:
    """
    FastAPI dependency to verify session and get the current user.
    Transparently refreshes the Spotify token if it's expired or near expiry.
    """
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        user_id_str = verify_user_id(session_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    user = db.query(User).filter(User.id == user_id_str).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Check if token is expired or near expiry (within 60 seconds)
    if user.token_expires_at < datetime.utcnow() + timedelta(seconds=60):
        try:
            refresh_token = decrypt_token(user.refresh_token_encrypted)
            token_data = refresh_access_token(refresh_token)

            # Update the user's access token and expiry
            user.access_token_encrypted = encrypt_token(token_data["access_token"])
            user.token_expires_at = token_data["expires_at"]
            db.commit()
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=401, detail="Token refresh failed") from e

    return user


def encrypt_token(token: str) -> str:
    """Helper to import the encryption function without circular import."""
    from app.core.security import encrypt_token as _encrypt_token
    return _encrypt_token(token)
