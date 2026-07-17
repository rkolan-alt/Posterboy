import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.db.base import get_db
from app.db.models import User, TopTracksCache, LibraryTracksCache, Album
from app.core.deps import get_current_user
from app.core.security import decrypt_token
from app.services.spotify_service import (
    get_top_tracks,
    get_albums,
    get_saved_tracks,
    get_user_playlists,
    get_playlist_tracks,
)
from app.services.ranking_service import score_albums_from_top_tracks, score_albums_from_library_tracks

router = APIRouter(prefix="/library", tags=["library"])

VALID_TIME_RANGES = {"short_term", "medium_term", "long_term"}
TOP_TRACKS_CACHE_TTL = timedelta(hours=1)
LIBRARY_TRACKS_CACHE_TTL = timedelta(hours=1)


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

    top_tracks = _get_top_tracks_cached(db, user, time_range, access_token)

    if not top_tracks:
        return {"time_range": time_range, "albums": []}

    ranked_albums = score_albums_from_top_tracks(top_tracks)
    top_n = ranked_albums[:limit]

    albums_by_id = _get_albums_cached(db, access_token, [entry["album_id"] for entry in top_n])

    albums_response = []
    for rank_position, entry in enumerate(top_n, start=1):
        album = albums_by_id.get(entry["album_id"])
        if album is None:
            # Album metadata fetch failed (e.g. album removed from Spotify) - skip it
            continue
        albums_response.append(
            {
                "rank": rank_position,
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
        )

    return {"time_range": time_range, "albums": albums_response}


@router.get("/library-albums")
def get_library_albums(
    limit: int = Query(6, ge=1, le=6),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the user's top N albums, ranked by frequency of songs in their library and playlists."""
    access_token = decrypt_token(user.access_token_encrypted)

    try:
        all_tracks = _get_library_tracks_cached(db, user, access_token)
    except httpx.HTTPStatusError as exc:
        raise _rate_limit_error(exc) from exc

    if not all_tracks:
        return {"albums": []}

    ranked_albums = score_albums_from_library_tracks(all_tracks)
    top_n = ranked_albums[:limit]

    albums_by_id = _get_albums_cached(db, access_token, [entry["album_id"] for entry in top_n])

    albums_response = []
    for rank_position, entry in enumerate(top_n, start=1):
        album = albums_by_id.get(entry["album_id"])
        if album is None:
            continue
        albums_response.append(
            {
                "rank": rank_position,
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
        )

    return {"albums": albums_response}


def _rate_limit_error(exc: httpx.HTTPStatusError) -> Exception:
    """Turn Spotify's 429 into something the UI can actually tell the user.

    Spotify sends Retry-After on 429; without this the whole crawl surfaced as a
    generic 500 and the dashboard just said "Could not load your albums".
    """
    if exc.response.status_code != 429:
        return exc

    retry_after = exc.response.headers.get("retry-after", "60")
    return HTTPException(
        status_code=429,
        detail=f"Spotify's rate limit was hit. Try again in about {retry_after} seconds.",
        headers={"Retry-After": retry_after},
    )


def _slim_track(track: dict) -> dict | None:
    """Reduce a Spotify track to the two fields ranking reads: its own ID (for
    dedup) and its album ID. Returns None for anything with no album id —
    local files and podcast episodes, which cannot belong to an album poster.
    """
    album_id = (track.get("album") or {}).get("id")
    if not album_id:
        return None
    return {"id": track.get("id"), "album": {"id": album_id}}


def _get_library_tracks_cached(db: Session, user: User, access_token: str) -> list[dict]:
    """Return the user's combined library tracks, crawling Spotify only when stale.

    See LibraryTracksCache: the crawl costs 100+ Spotify requests, so running it
    per dashboard load reliably trips the API's rate limit.
    """
    entry = (
        db.query(LibraryTracksCache).filter(LibraryTracksCache.user_id == user.id).first()
    )

    if entry and entry.expires_at > datetime.utcnow():
        return entry.payload

    saved_tracks = get_saved_tracks(access_token)

    all_playlist_tracks = []
    for playlist in get_user_playlists(access_token):
        all_playlist_tracks.extend(get_playlist_tracks(access_token, playlist["id"]))

    # Dedup happens in the ranking function, which counts each track ID once.
    slimmed = [t for t in (_slim_track(t) for t in saved_tracks + all_playlist_tracks) if t]

    now = datetime.utcnow()
    if entry:
        entry.payload = slimmed
        entry.fetched_at = now
        entry.expires_at = now + LIBRARY_TRACKS_CACHE_TTL
    else:
        db.add(
            LibraryTracksCache(
                user_id=user.id,
                payload=slimmed,
                fetched_at=now,
                expires_at=now + LIBRARY_TRACKS_CACHE_TTL,
            )
        )

    try:
        db.commit()
    except IntegrityError:
        # A concurrent crawl (React StrictMode fires the effect twice in dev)
        # inserted the row first. Its payload is equivalent, so keep ours in
        # memory and drop the duplicate write.
        db.rollback()

    return slimmed


def _get_top_tracks_cached(db: Session, user: User, time_range: str, access_token: str) -> list[dict]:
    """Return cached top tracks if fresh, otherwise fetch from Spotify and refresh the cache."""
    cache_entry = (
        db.query(TopTracksCache)
        .filter(TopTracksCache.user_id == user.id, TopTracksCache.time_range == time_range)
        .first()
    )

    if cache_entry and cache_entry.expires_at > datetime.utcnow():
        return cache_entry.payload

    top_tracks = get_top_tracks(access_token, time_range=time_range, limit=50)
    now = datetime.utcnow()

    if cache_entry:
        cache_entry.payload = top_tracks
        cache_entry.fetched_at = now
        cache_entry.expires_at = now + TOP_TRACKS_CACHE_TTL
    else:
        cache_entry = TopTracksCache(
            user_id=user.id,
            time_range=time_range,
            payload=top_tracks,
            fetched_at=now,
            expires_at=now + TOP_TRACKS_CACHE_TTL,
        )
        db.add(cache_entry)

    db.commit()
    return top_tracks


def _get_albums_cached(db: Session, access_token: str, album_ids: list[str]) -> dict[str, Album]:
    """Return {album_id: Album} for the given IDs, fetching and caching any not already stored."""
    cached = {a.id: a for a in db.query(Album).filter(Album.id.in_(album_ids)).all()}
    missing_ids = [aid for aid in album_ids if aid not in cached]

    if not missing_ids:
        return cached

    fetched_albums = get_albums(access_token, missing_ids)
    now = datetime.utcnow()

    for album_data in fetched_albums:
        if album_data is None:
            continue  # Spotify returns null for IDs it couldn't resolve

        tracklist = [
            {
                "track_number": t["track_number"],
                "name": t["name"],
                "duration_ms": t["duration_ms"],
            }
            for t in album_data["tracks"]["items"]
        ]

        album = Album(
            id=album_data["id"],
            name=album_data["name"],
            artist_name=", ".join(a["name"] for a in album_data["artists"]),
            release_date=album_data.get("release_date"),
            image_url=album_data["images"][0]["url"] if album_data["images"] else None,
            total_tracks=album_data.get("total_tracks"),
            tracklist=tracklist,
            spotify_uri=album_data["uri"],
            fetched_at=now,
        )
        db.add(album)
        cached[album.id] = album

    db.commit()
    return cached
