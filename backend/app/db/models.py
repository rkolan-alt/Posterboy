from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    spotify_user_id = Column(String(255), unique=True, nullable=False, index=True)
    display_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)

    # Encrypted tokens
    access_token_encrypted = Column(String, nullable=False)
    refresh_token_encrypted = Column(String, nullable=False)
    token_expires_at = Column(DateTime, nullable=False)

    created_at = Column(DateTime, default=func.now(), nullable=False)
    last_login_at = Column(DateTime, default=func.now(), nullable=False, onupdate=func.now())

    def __repr__(self):
        return f"<User {self.spotify_user_id}>"


class TopTracksCache(Base):
    """Caches a user's raw top-tracks response per time_range, TTL ~1hr."""

    __tablename__ = "top_tracks_cache"
    __table_args__ = (UniqueConstraint("user_id", "time_range", name="uq_user_time_range"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    time_range = Column(String(20), nullable=False)
    payload = Column(JSONB, nullable=False)
    fetched_at = Column(DateTime, default=func.now(), nullable=False)
    expires_at = Column(DateTime, nullable=False)


class LibraryTracksCache(Base):
    """Caches a user's combined saved + playlist tracks, TTL ~1hr.

    The crawl behind this is expensive: paginated saved tracks, then the
    paginated playlist list, then a paginated item fetch per playlist — easily
    100+ Spotify requests. Uncached it re-runs on every dashboard load and hits
    Spotify's rate limit quickly.

    Payload holds only what ranking reads ({"id", "album": {"id"}}); a full
    library is thousands of tracks and storing them whole would be enormous.
    """

    __tablename__ = "library_tracks_cache"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False, index=True
    )
    payload = Column(JSONB, nullable=False)
    fetched_at = Column(DateTime, default=func.now(), nullable=False)
    expires_at = Column(DateTime, nullable=False)


class Album(Base):
    """Shared album metadata cache, keyed by Spotify album ID. Not user-specific."""

    __tablename__ = "albums"

    id = Column(String(64), primary_key=True)  # Spotify album ID
    name = Column(String(500), nullable=False)
    artist_name = Column(String(500), nullable=False)
    release_date = Column(String(20), nullable=True)
    image_url = Column(String(1000), nullable=True)
    total_tracks = Column(Integer, nullable=True)
    tracklist = Column(JSONB, nullable=False)
    spotify_uri = Column(String(255), nullable=False)
    fetched_at = Column(DateTime, default=func.now(), nullable=False)

    def __repr__(self):
        return f"<Album {self.name}>"


class AlbumPalette(Base):
    """Cached dominant-colour palette for an album's cover art. No TTL: cover
    art is immutable, so this is computed once per album and kept.

    Extraction downloads the art and runs k-means (~0.3s measured), and both the
    poster preview and the PNG render need it, so uncached it would re-run on
    every card of every dashboard load.

    Separate from Album rather than a column on it: create_all() does not add
    columns to an existing table.

    As of milestone 5, `palette` holds a dominance-ordered list of rich colour
    entries — {hex, rgb, lab, weight} — not bare hex strings. The Lab values and
    weights are ColorSync's per-album similarity feature vector; the hex values
    still drive the poster swatch strip. The shape lives inside the schemaless
    JSONB, so no migration was needed — legacy hex-only rows are upgraded in
    place on next read (see routers/posters._get_palette_cached).
    """

    __tablename__ = "album_palettes"

    album_id = Column(String(64), ForeignKey("albums.id"), primary_key=True)
    palette = Column(JSONB, nullable=False)  # [{hex, rgb, lab, weight}], most dominant first
    computed_at = Column(DateTime, default=func.now(), nullable=False)
