"""Cached palette access, shared by the poster and colorsync routers.

Posters want the hex swatches; ColorSync wants the Lab + weight feature vectors.
Both come from the same cached extraction, so it lives here rather than in a
router.
"""
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import Album, AlbumPalette
from app.services.color_service import extract_palette


def get_album_palette(db: Session, album: Album) -> list[dict]:
    """Return an album's rich palette ([{hex, rgb, lab, weight}]), extracting it
    only the first time it is asked for.

    A legacy row from before milestone 5 holds a bare list of hex strings (no Lab
    values) — detected here and upgraded in place, so ColorSync is never left
    without the feature vectors it needs. Returns [] for albums with no cover art.
    """
    if not album.image_url:
        return []

    entry = db.query(AlbumPalette).filter(AlbumPalette.album_id == album.id).first()
    if entry and _is_rich(entry.palette):
        return entry.palette

    palette = extract_palette(album.image_url)
    if entry:
        entry.palette = palette  # upgrade legacy hex-only row to the rich shape
    else:
        db.add(AlbumPalette(album_id=album.id, palette=palette))
    try:
        db.commit()
    except IntegrityError:
        # A concurrent request for the same album cached it first. Same art and
        # a fixed random_state, so its palette is identical to ours.
        db.rollback()

    return palette


def _is_rich(palette) -> bool:
    """A palette is rich (has Lab + weights) when its entries are dicts, not the
    legacy list of hex strings. Empty palettes count as rich — nothing to upgrade."""
    return not palette or isinstance(palette[0], dict)
