from app.services.ranking_service import score_albums_from_top_tracks


def make_track(album_id: str) -> dict:
    return {"album": {"id": album_id}}


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
