import httpx
import secrets
from datetime import datetime, timedelta
from app.core.config import settings

SCOPE = "user-top-read user-read-private user-read-email"
AUTHORIZE_URL = "https://accounts.spotify.com/authorize"
TOKEN_URL = "https://accounts.spotify.com/api/token"
ME_URL = "https://api.spotify.com/v1/me"


def build_authorize_url(state: str) -> str:
    """Build the Spotify authorization URL."""
    return (
        f"{AUTHORIZE_URL}?"
        f"client_id={settings.spotify_client_id}&"
        f"response_type=code&"
        f"redirect_uri={settings.spotify_redirect_uri}&"
        f"scope={SCOPE}&"
        f"state={state}"
    )


def exchange_code_for_tokens(code: str) -> dict:
    """Exchange authorization code for access and refresh tokens."""
    response = httpx.post(
        TOKEN_URL,
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.spotify_redirect_uri,
            "client_id": settings.spotify_client_id,
            "client_secret": settings.spotify_client_secret,
        },
    )
    response.raise_for_status()
    data = response.json()

    return {
        "access_token": data["access_token"],
        "refresh_token": data.get("refresh_token"),
        "expires_at": datetime.utcnow() + timedelta(seconds=data.get("expires_in", 3600)),
    }


def refresh_access_token(refresh_token: str) -> dict:
    """Refresh an expired access token using a refresh token."""
    response = httpx.post(
        TOKEN_URL,
        data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": settings.spotify_client_id,
            "client_secret": settings.spotify_client_secret,
        },
    )
    response.raise_for_status()
    data = response.json()

    return {
        "access_token": data["access_token"],
        "expires_at": datetime.utcnow() + timedelta(seconds=data.get("expires_in", 3600)),
    }


def get_current_user_profile(access_token: str) -> dict:
    """Fetch the current user's profile from Spotify."""
    response = httpx.get(
        ME_URL,
        headers={"Authorization": f"Bearer {access_token}"},
    )
    response.raise_for_status()
    data = response.json()

    return {
        "spotify_user_id": data["id"],
        "display_name": data.get("display_name"),
        "email": data.get("email"),
    }


def generate_state() -> str:
    """Generate a random state string for OAuth."""
    return secrets.token_urlsafe(32)
