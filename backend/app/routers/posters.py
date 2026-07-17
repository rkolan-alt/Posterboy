from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.db.models import User, Album, AlbumPalette
from app.core.deps import get_current_user
from app.services.color_service import get_dominant_colors
from app.services.poster_service import build_poster_spec
from app.services.poster_render_service import render_poster_png

router = APIRouter(prefix="/posters", tags=["posters"])


@router.get("/{album_id}")
def get_poster_spec(
    album_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the poster spec as JSON (for frontend preview rendering)."""
    album = _get_album_or_404(album_id, db)
    return build_poster_spec(album, _get_palette_cached(db, album))


@router.get("/{album_id}/render.png")
def render_poster(
    album_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Render the poster to a PNG via Playwright and stream it back."""
    album = _get_album_or_404(album_id, db)
    spec = build_poster_spec(album, _get_palette_cached(db, album))
    png_bytes = render_poster_png(spec)

    return Response(content=png_bytes, media_type="image/png")


def _get_palette_cached(db: Session, album: Album) -> list[str]:
    """Return an album's palette, extracting it only the first time it is asked for."""
    if not album.image_url:
        return []

    entry = db.query(AlbumPalette).filter(AlbumPalette.album_id == album.id).first()
    if entry:
        return entry.palette

    palette = get_dominant_colors(album.image_url)
    db.add(AlbumPalette(album_id=album.id, palette=palette))
    try:
        db.commit()
    except IntegrityError:
        # A concurrent request for the same album cached it first. Same art and
        # a fixed random_state, so its palette is identical to ours.
        db.rollback()

    return palette


def _get_album_or_404(album_id: str, db: Session) -> Album:
    album = db.query(Album).filter(Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    return album
