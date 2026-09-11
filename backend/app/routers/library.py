import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.db.models import User
from app.core.deps import get_current_user
from app.core.security import decrypt_token
from app.services.library_service import (
    VALID_TIME_RANGES,
    rate_limit_error,
    get_library_tracks_cached,
    get_top_tracks_cached,
    get_albums_cached,
    filter_library_tracks,
    get_playlists_meta,
)
from app.services.ranking_service import (
    score_albums_from_top_tracks,
    score_albums_from_library_tracks,
)

router = APIRouter(prefix="/library", tags=["library"])


@router.get("/top-albums")
def get_top_albums(
    time_range: str = Query("medium_term"),
    limit: int = Query(6, ge=1, le=6),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the user's top N albums, ranked by listening prominence for the given time_range."""
    if time_range not in VALID_TIME_RANGES:
        raise HTTPException(
            status_code=400,
            detail="time_range must be one of: short_term, medium_term, long_term",
        )

    access_token = decrypt_token(user.access_token_encrypted)

    top_tracks = get_top_tracks_cached(db, user, time_range, access_token)

    if not top_tracks:
        return {"time_range": time_range, "albums": []}

    ranked_albums = score_albums_from_top_tracks(top_tracks)
    top_n = ranked_albums[:limit]

    albums_by_id = get_albums_cached(db, access_token, [entry["album_id"] for entry in top_n])

    albums_response = []
    for rank_position, entry in enumerate(top_n, start=1):
        album = albums_by_id.get(entry["album_id"])
        if album is None:
            # Album metadata fetch failed (e.g. album removed from Spotify) - skip it
            continue
        albums_response.append(_album_payload(album, rank=rank_position, entry=entry))

    return {"time_range": time_range, "albums": albums_response}


@router.get("/playlists")
def get_playlists(
    user: User = Depends(get_current_user),
):
    """List the user's playlists (id, name, track count, cover) for the picker."""
    access_token = decrypt_token(user.access_token_encrypted)
    try:
        return {"playlists": get_playlists_meta(access_token)}
    except httpx.HTTPStatusError as exc:
        raise rate_limit_error(exc) from exc


@router.get("/library-albums")
def get_library_albums(
    limit: int = Query(6, ge=1, le=6),
    exclude_liked: bool = Query(False),
    playlist_ids: list[str] | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the user's top N albums, ranked by frequency of songs in their library and playlists.

    Set exclude_liked=true to ignore Liked Songs. Pass playlist_ids to rank only
    the chosen playlists (omit for all).
    """
    access_token = decrypt_token(user.access_token_encrypted)

    try:
        all_tracks = get_library_tracks_cached(db, user, access_token)
    except httpx.HTTPStatusError as exc:
        raise rate_limit_error(exc) from exc

    all_tracks = filter_library_tracks(
        all_tracks, exclude_liked=exclude_liked, playlist_ids=playlist_ids
    )

    if not all_tracks:
        return {"albums": []}

    ranked_albums = score_albums_from_library_tracks(all_tracks)
    top_n = ranked_albums[:limit]

    albums_by_id = get_albums_cached(db, access_token, [entry["album_id"] for entry in top_n])

    albums_response = []
    for rank_position, entry in enumerate(top_n, start=1):
        album = albums_by_id.get(entry["album_id"])
        if album is None:
            continue
        albums_response.append(_album_payload(album, rank=rank_position, entry=entry))

    return {"albums": albums_response}


def _album_payload(album, rank: int, entry: dict) -> dict:
    """The album shape the frontend grid consumes (shared by both ranked modes)."""
    return {
        "rank": rank,
        "score": round(entry["score"], 4),
        "track_count": entry["track_count"],
        "album_id": album.id,
        "name": album.name,
        "artist_name": album.artist_name,
        "release_date": album.release_date,
        "image_url": album.image_url,
        "total_tracks": album.total_tracks,
        "tracklist": album.tracklist,
        "spotify_uri": album.spotify_uri,
    }
