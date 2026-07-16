from app.services.ranking_service import score_albums_from_top_tracks, score_albums_from_library_tracks


def make_track(album_id: str, track_id: str = None) -> dict:
    if track_id is None:
        track_id = f"{album_id}_default"
    return {"id": track_id, "album": {"id": album_id}}


def test_empty_track_list_returns_empty():
    assert score_albums_from_top_tracks([]) == []


def test_single_album_gets_reciprocal_rank_score():
    tracks = [make_track("A")]
    result = score_albums_from_top_tracks(tracks)

    assert result == [{"album_id": "A", "score": 1.0, "track_count": 1}]


def test_album_with_multiple_top_tracks_outranks_album_with_one_lower_track():
    # Album A has tracks at positions 0, 1, 2 (top 3 most-listened tracks).
    # Album B has a single track at position 3.
    tracks = [
        make_track("A"),
        make_track("A"),
        make_track("A"),
        make_track("B"),
    ]
    result = score_albums_from_top_tracks(tracks)

    assert [entry["album_id"] for entry in result] == ["A", "B"]
    assert result[0]["track_count"] == 3
    assert result[1]["track_count"] == 1
    # A's score = 1/1 + 1/2 + 1/3 ; B's score = 1/4
    assert result[0]["score"] > result[1]["score"]


def test_reciprocal_rank_weighting_favors_higher_positions():
    # Two albums each with exactly one track - the earlier-ranked track's
    # album should score higher.
    tracks = [make_track("early"), make_track("late")]
    result = score_albums_from_top_tracks(tracks)

    scores = {entry["album_id"]: entry["score"] for entry in result}
    assert scores["early"] > scores["late"]
    assert scores["early"] == 1.0
    assert scores["late"] == 0.5


def test_results_sorted_descending_by_score():
    tracks = [
        make_track("low"),
        make_track("mid"),
        make_track("mid"),
        make_track("high"),
        make_track("high"),
        make_track("high"),
    ]
    result = score_albums_from_top_tracks(tracks)
    scores = [entry["score"] for entry in result]

    assert scores == sorted(scores, reverse=True)


# Library ranking tests (by frequency, with deduplication)


def test_library_empty_track_list_returns_empty():
    assert score_albums_from_library_tracks([]) == []


def test_library_single_album_single_track():
    tracks = [make_track("A", "track_1")]
    result = score_albums_from_library_tracks(tracks)

    assert result == [{"album_id": "A", "score": 1.0, "track_count": 1}]


def test_library_deduplicates_by_track_id():
    # Same track appears twice (e.g., in 2 playlists) - should only count once
    tracks = [
        make_track("A", "track_1"),
        make_track("A", "track_1"),  # duplicate
    ]
    result = score_albums_from_library_tracks(tracks)

    assert result == [{"album_id": "A", "score": 1.0, "track_count": 1}]


def test_library_multiple_albums_ranked_by_frequency():
    # Album A has 3 unique tracks, Album B has 1 track
    tracks = [
        make_track("A", "track_a1"),
        make_track("A", "track_a2"),
        make_track("A", "track_a3"),
        make_track("B", "track_b1"),
    ]
    result = score_albums_from_library_tracks(tracks)

    assert [entry["album_id"] for entry in result] == ["A", "B"]
    assert result[0]["score"] == 3.0
    assert result[0]["track_count"] == 3
    assert result[1]["score"] == 1.0
    assert result[1]["track_count"] == 1


def test_library_deduplicates_across_albums():
    # Same track ID in different albums (shouldn't happen, but test robustness)
    # When deduplicated, second occurrence is skipped
    tracks = [
        make_track("A", "shared_track"),
        make_track("B", "shared_track"),  # Same track ID, different album - skip on duplicate
        make_track("B", "track_b1"),
    ]
    result = score_albums_from_library_tracks(tracks)

    # First track counted for A, then the duplicate is skipped, then track_b1 for B
    assert result[0]["album_id"] == "A"
    assert result[0]["score"] == 1.0
    assert result[1]["album_id"] == "B"
    assert result[1]["score"] == 1.0
