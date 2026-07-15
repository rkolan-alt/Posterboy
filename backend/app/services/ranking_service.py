"""
Turns a raw, already-rank-ordered list of Spotify top tracks into a ranked
list of albums, using reciprocal-rank scoring: a track at position i
(0-indexed, most-listened first) contributes weight 1/(i+1) to its album.
Weights are summed per album, so an album with several highly-ranked tracks
scores higher than one with a single, lower-ranked track.
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
