import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.db.models import User, Album
from app.core.deps import get_current_user
from app.core.security import decrypt_token
from app.services.library_service import (
    rate_limit_error,
    get_library_tracks_cached,
    get_albums_cached,
)
from app.services.ranking_service import score_albums_from_library_tracks
from app.services.palette_service import get_album_palette
from app.services.color_service import palette_distance, palette_hexes

router = APIRouter(prefix="/colorsync", tags=["colorsync"])

# ColorSync compares the seed against the user's most-prominent library albums
# rather than the entire library: each candidate costs a cover-art download +
# k-means extraction the first time, so an unbounded pool would take minutes and
# hammer Spotify. The top slice captures the albums a user actually cares about.
CANDIDATE_POOL_SIZE = 40


@router.get("/recommendations")
def get_recommendations(
    seed_album_id: str | None = Query(None),
    limit: int = Query(6, ge=1, le=6),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Rank the user's library albums by how closely their cover-art palette
    matches a seed album, returning the top N.

    The seed defaults to the user's #1 library-ranked album; pass seed_album_id
    (e.g. from album search) to match against any album instead.
    """
    access_token = decrypt_token(user.access_token_encrypted)

    try:
        all_tracks = get_library_tracks_cached(db, user, access_token)
    except httpx.HTTPStatusError as exc:
        raise rate_limit_error(exc) from exc

    ranked = score_albums_from_library_tracks(all_tracks)
    if not ranked:
        raise HTTPException(
            status_code=404,
            detail="No albums found in your library to match against.",
        )

    # Default seed = the user's most-prominent library album.
    if seed_album_id is None:
        seed_album_id = ranked[0]["album_id"]

    candidate_ids = [entry["album_id"] for entry in ranked[:CANDIDATE_POOL_SIZE]]

    # The seed may be external (searched), so make sure its metadata is fetched too.
    needed_ids = list(dict.fromkeys(candidate_ids + [seed_album_id]))
    try:
        albums_by_id = get_albums_cached(db, access_token, needed_ids)
    except httpx.HTTPStatusError as exc:
        raise rate_limit_error(exc) from exc

    seed_album = albums_by_id.get(seed_album_id)
    if seed_album is None:
        raise HTTPException(status_code=404, detail="Seed album not found on Spotify.")

    seed_palette = get_album_palette(db, seed_album)
    if not seed_palette:
        raise HTTPException(
            status_code=422,
            detail="Seed album has no cover art to extract a palette from.",
        )

    scored = []
    for album_id in candidate_ids:
        if album_id == seed_album_id:
            continue  # never recommend the seed itself
        album = albums_by_id.get(album_id)
        if album is None:
            continue
        distance = palette_distance(seed_palette, get_album_palette(db, album))
        scored.append((distance, album))

    scored.sort(key=lambda pair: pair[0])
    top_n = scored[:limit]

    return {
        "seed": {
            "album_id": seed_album.id,
            "name": seed_album.name,
            "artist_name": seed_album.artist_name,
            "image_url": seed_album.image_url,
            "palette": palette_hexes(seed_palette),
        },
        "albums": [
            _match_payload(album, rank=rank, distance=distance)
            for rank, (distance, album) in enumerate(top_n, start=1)
        ],
    }


def _match_payload(album: Album, rank: int, distance: float) -> dict:
    """Album shape the frontend grid consumes, plus the colour-match distance."""
    return {
        "rank": rank,
        "distance": round(distance, 2),
        "album_id": album.id,
        "name": album.name,
        "artist_name": album.artist_name,
        "release_date": album.release_date,
        "image_url": album.image_url,
        "total_tracks": album.total_tracks,
        "tracklist": album.tracklist,
        "spotify_uri": album.spotify_uri,
    }
