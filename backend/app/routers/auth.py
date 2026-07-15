from fastapi import APIRouter, Depends, HTTPException, Response, Cookie
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.config import settings
from app.db.base import get_db
from app.db.models import User
from app.core.session import sign_user_id, set_session_cookie_params
from app.core.security import encrypt_token
from app.services.spotify_service import (
    build_authorize_url,
    exchange_code_for_tokens,
    get_current_user_profile,
    generate_state,
)
from app.core.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/login")
def login():
    """Redirect the browser to Spotify's authorization page."""
    state = generate_state()
    auth_url = build_authorize_url(state)

    resp = RedirectResponse(auth_url, status_code=303)
    # Short-lived CSRF cookie; secure flag driven by env so it is storable over
    # plain HTTP in local dev (Secure cookies are dropped over http://).
    resp.set_cookie(
        "oauth_state",
        state,
        max_age=600,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
    )
    return resp


@router.get("/callback")
def callback(
    state: str,
    code: str | None = None,
    error: str | None = None,
    oauth_state: str | None = Cookie(None),
    db: Session = Depends(get_db),
):
    """Handle the OAuth redirect from Spotify: verify state, exchange the code, sign the user in."""
    # Spotify redirected back with an error (user denied, server_error, etc.)
    if error:
        return RedirectResponse(f"{settings.frontend_url}/callback?error={error}", status_code=303)

    if not code:
        return RedirectResponse(f"{settings.frontend_url}/callback?error=missing_code", status_code=303)

    # Verify state matches the CSRF cookie we set in /login
    if not oauth_state or oauth_state != state:
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    try:
        token_data = exchange_code_for_tokens(code)
        user_profile = get_current_user_profile(token_data["access_token"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Authorization failed: {str(e)}")

    # Upsert the user
    user = db.query(User).filter(User.spotify_user_id == user_profile["spotify_user_id"]).first()

    if user:
        user.access_token_encrypted = encrypt_token(token_data["access_token"])
        user.refresh_token_encrypted = encrypt_token(token_data["refresh_token"])
        user.token_expires_at = token_data["expires_at"]
        user.display_name = user_profile["display_name"]
        user.email = user_profile["email"]
        user.last_login_at = datetime.utcnow()
    else:
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

    # Sign the user in and send them back to the frontend
    resp = RedirectResponse(f"{settings.frontend_url}/callback", status_code=303)
    session_token = sign_user_id(str(user.id))
    resp.set_cookie("session_id", session_token, **set_session_cookie_params())
    resp.delete_cookie("oauth_state")
    return resp


@router.post("/logout")
def logout(response: Response):
    """Clear the session cookie."""
    response.delete_cookie("session_id")
    return {"message": "Logged out"}


@router.get("/me")
def get_me(user: User = Depends(get_current_user)):
    """Return the currently signed-in user."""
    return {
        "id": str(user.id),
        "spotify_user_id": user.spotify_user_id,
        "display_name": user.display_name,
        "email": user.email,
    }
