from fastapi import APIRouter, Depends, HTTPException, Response, Cookie
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.base import get_db
from app.db.models import User
from app.core.session import sign_user_id, verify_user_id, set_session_cookie_params
from app.core.security import encrypt_token, decrypt_token
from app.services.spotify_service import (
    build_authorize_url,
    exchange_code_for_tokens,
    get_current_user_profile,
    generate_state,
)
from app.core.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/login")
def login(response: Response):
    """Redirect to Spotify authorization."""
    state = generate_state()
    auth_url = build_authorize_url(state)

    # Store state in a short-lived cookie for CSRF protection
    response.set_cookie(
        "oauth_state",
        state,
        max_age=600,
        httponly=True,
        secure=True,
        samesite="Lax",
    )

    response.status_code = 303
    response.headers["Location"] = auth_url
    return response


@router.get("/callback")
def callback(
    code: str,
    state: str,
    state_cookie: str | None = Cookie(None),
    db: Session = Depends(get_db),
    response: Response = None,
):
    """Handle OAuth callback from Spotify."""
    if response is None:
        response = Response()

    # Verify state
    if not state_cookie or state_cookie != state:
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    try:
        # Exchange code for tokens
        token_data = exchange_code_for_tokens(code)

        # Get user profile
        user_profile = get_current_user_profile(token_data["access_token"])

        # Upsert user in database
        user = db.query(User).filter(User.spotify_user_id == user_profile["spotify_user_id"]).first()

        if user:
            # Update existing user
            user.access_token_encrypted = encrypt_token(token_data["access_token"])
            user.refresh_token_encrypted = encrypt_token(token_data["refresh_token"])
            user.token_expires_at = token_data["expires_at"]
            user.display_name = user_profile["display_name"]
            user.email = user_profile["email"]
            user.last_login_at = datetime.utcnow()
        else:
            # Create new user
            user = User(
                spotify_user_id=user_profile["spotify_user_id"],
                display_name=user_profile["display_name"],
                email=user_profile["email"],
                access_token_encrypted=encrypt_token(token_data["access_token"]),
                refresh_token_encrypted=encrypt_token(token_data["refresh_token"]),
                token_expires_at=token_data["expires_at"],
            )
            db.add(user)

        db.commit()
        db.refresh(user)

        # Set session cookie
        session_token = sign_user_id(str(user.id))
        cookie_params = set_session_cookie_params()

        response.set_cookie("session_id", session_token, **cookie_params)
        response.status_code = 303
        response.headers["Location"] = "http://127.0.0.1:5173/callback"

        return response

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Authorization failed: {str(e)}")


@router.post("/logout")
def logout(response: Response):
    """Clear session cookie."""
    response.delete_cookie("session_id")
    return {"message": "Logged out"}


@router.get("/me")
def get_me(user: User = Depends(get_current_user)):
    """Get current user info."""
    return {
        "id": str(user.id),
        "spotify_user_id": user.spotify_user_id,
        "display_name": user.display_name,
        "email": user.email,
    }
