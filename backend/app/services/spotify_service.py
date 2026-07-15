import httpx
import secrets
from urllib.parse import urlencode
from datetime import datetime, timedelta
from app.core.config import settings

SCOPE = "user-top-read user-read-private user-read-email"
AUTHORIZE_URL = "https://accounts.spotify.com/authorize"
TOKEN_URL = "https://accounts.spotify.com/api/token"
ME_URL = "https://api.spotify.com/v1/me"
TOP_TRACKS_URL = "https://api.spotify.com/v1/me/top/tracks"
ALBUMS_URL = "https://api.spotify.com/v1/albums"


def build_authorize_url(state: str) -> str:
    """Build the Spotify authorization URL with properly encoded query parameters."""
    params = {
        "client_id": settings.spotify_client_id,
        "response_type": "code",
        "redirect_uri": settings.spotify_redirect_uri,
        "scope": SCOPE,
        "state": state,
    }
    return f"{AUTHORIZE_URL}?{urlencode(params)}"


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


def get_top_tracks(access_token: str, time_range: str = "medium_term", limit: int = 50) -> list[dict]:
    """Fetch the user's top tracks, already ordered by Spotify's affinity ranking (most-listened first)."""
    response = httpx.get(
        TOP_TRACKS_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        params={"time_range": time_range, "limit": limit},
    )
    response.raise_for_status()
    return response.json()["items"]


def get_albums(access_token: str, album_ids: list[str]) -> list[dict]:
    """Fetch full album metadata (including tracklist) for a list of album IDs.

    Uses Spotify's single-album endpoint (GET /albums/{id}) one ID at a time.
    The batch endpoint (GET /albums?ids=...) returns 403 for apps in Spotify's
    Development Mode, but individual album lookups are still permitted. We only
    ever fetch up to ~6 albums, so sequential single calls are fine.
    """
    albums: list[dict] = []
    for album_id in album_ids:
        response = httpx.get(
            f"{ALBUMS_URL}/{album_id}",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if response.status_code == 404:
            continue  # album no longer available on Spotify
        response.raise_for_status()
        albums.append(response.json())

    return albums
