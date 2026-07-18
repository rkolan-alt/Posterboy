from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.db.models import User, Album
from app.core.deps import get_current_user
from app.services.color_service import palette_hexes
from app.services.palette_service import get_album_palette
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
    """The poster template only needs hex swatches; the shared cache stores the
    rich {hex, rgb, lab, weight} palette (Lab/weight power ColorSync)."""
    return palette_hexes(get_album_palette(db, album))


def _get_album_or_404(album_id: str, db: Session) -> Album:
    album = db.query(Album).filter(Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    return album
