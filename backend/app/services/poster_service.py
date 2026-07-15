import math
from app.db.models import Album


def build_poster_spec(album: Album, palette: list[str]) -> dict:
    """
    Assemble everything the poster template needs to render, from a cached
    Album row plus its extracted color palette.
    """
    title = album.name.upper()
    spine_lines = _build_spine_lines(title)

    tracks = [
        {**track, "num_display": f"{track['track_number']:02d}"}
        for track in album.tracklist
    ]
    half = math.ceil(len(tracks) / 2)
    col1, col2 = tracks[:half], tracks[half:]

    year = album.release_date.split("-")[0] if album.release_date else ""

    return {
        "album_id": album.id,
        "title": album.name,
        "artist": album.artist_name,
        "year": year,
        "image_url": album.image_url,
        "spine_lines": spine_lines,
        "palette": palette,
        "col1": col1,
        "col2": col2,
    }


def _build_spine_lines(title: str) -> list[dict]:
    """
    Split the title into a letter-per-line sequence for the vertical spine
    bar, with a small separator marker between words (matches the reference
    poster's word-separated, one-letter-per-line spine text).
    """
    words = title.split()
    lines: list[dict] = []

    for i, word in enumerate(words):
        for letter in word:
            lines.append({"type": "letter", "value": letter})
        if i < len(words) - 1:
            lines.append({"type": "sep", "value": "•"})

    return lines
