import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.db.models import User
from app.core.deps import get_current_user
from app.core.security import decrypt_token
from app.services.library_service import rate_limit_error
from app.services.spotify_service import search_albums

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/albums")
def search_albums_endpoint(
    q: str = Query(..., min_length=1),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Proxy Spotify's album search, powering the ColorSync seed picker."""
    access_token = decrypt_token(user.access_token_encrypted)

    try:
        results = search_albums(access_token, q)
    except httpx.HTTPStatusError as exc:
        raise rate_limit_error(exc) from exc

    return {"albums": results}
