"""
Scoring strategies for ranking albums.
"""


def score_albums_from_top_tracks(tracks: list[dict]) -> list[dict]:
    """
    tracks: Spotify's raw top-tracks items, in rank order (index 0 = most listened).
            Each item must have track["album"]["id"].

    Returns albums sorted by descending score:
        [{"album_id": str, "score": float, "track_count": int}, ...]
    """
    scores: dict[str, float] = {}
    track_counts: dict[str, int] = {}

    for position, track in enumerate(tracks):
        album_id = track["album"]["id"]
        weight = 1.0 / (position + 1)
        scores[album_id] = scores.get(album_id, 0.0) + weight
        track_counts[album_id] = track_counts.get(album_id, 0) + 1

    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)

    return [
        {"album_id": album_id, "score": score, "track_count": track_counts[album_id]}
        for album_id, score in ranked
    ]


def score_albums_from_library_tracks(tracks: list[dict]) -> list[dict]:
    """
    Rank albums by the frequency of songs from each album in the user's library.
    Each track is counted once (deduplication by track ID).

    tracks: List of Spotify track items (e.g., from saved tracks + playlists).
            Each item must have track["album"]["id"].

    Returns albums sorted by descending song count:
        [{"album_id": str, "score": float, "track_count": int}, ...]
    """
    seen_track_ids = set()
    scores: dict[str, int] = {}
    track_counts: dict[str, int] = {}

    for track in tracks:
        track_id = track.get("id")
        if not track_id or track_id in seen_track_ids:
            continue
        seen_track_ids.add(track_id)

        album_id = track["album"]["id"]
        scores[album_id] = scores.get(album_id, 0) + 1
        track_counts[album_id] = track_counts.get(album_id, 0) + 1

    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)

    return [
        {"album_id": album_id, "score": float(score), "track_count": track_counts[album_id]}
        for album_id, score in ranked
    ]
