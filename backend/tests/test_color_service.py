import numpy as np

from app.services.color_service import palette_distance, palette_from_pixels, palette_hexes


def palette(*entries: tuple[list[float], float]) -> list[dict]:
    """Build a palette of {lab, weight} entries for distance tests."""
    return [{"lab": lab, "weight": w} for lab, w in entries]


# Reference CIE-Lab values for a few pure colours.
RED = [53.24, 80.09, 67.2]
BLUE = [32.3, 79.19, -107.86]
GREEN = [87.74, -86.18, 83.18]


def make_pixels(colors_with_counts: list[tuple[tuple[int, int, int], int]]) -> np.ndarray:
    """Build an (N, 3) uint8 pixel array from (rgb, count) pairs."""
    blocks = [np.tile(np.array(rgb, dtype=np.uint8), (count, 1)) for rgb, count in colors_with_counts]
    return np.vstack(blocks)


def test_palette_is_ordered_by_dominance():
    # 600 red pixels, 400 blue pixels; k=2 recovers exactly those two clusters.
    pixels = make_pixels([((255, 0, 0), 600), ((0, 0, 255), 400)])
    palette = palette_from_pixels(pixels, k=2)

    assert len(palette) == 2
    assert palette[0]["hex"] == "#ff0000"  # most dominant first
    assert palette[1]["hex"] == "#0000ff"
    assert palette[0]["weight"] > palette[1]["weight"]


def test_weights_are_pixel_fractions_that_sum_to_one():
    pixels = make_pixels([((255, 0, 0), 600), ((0, 0, 255), 400)])
    palette = palette_from_pixels(pixels, k=2)

    assert palette[0]["weight"] == 0.6
    assert palette[1]["weight"] == 0.4
    assert sum(c["weight"] for c in palette) == 1.0


def test_entry_shape_carries_rgb_and_lab():
    pixels = make_pixels([((255, 0, 0), 600), ((0, 0, 255), 400)])
    red = palette_from_pixels(pixels, k=2)[0]

    assert red["rgb"] == [255, 0, 0]
    assert len(red["lab"]) == 3
    # Pure red in CIE-Lab: L ~53, strongly positive a (red-green axis).
    L, a, b = red["lab"]
    assert 45 < L < 60
    assert a > 50


def test_palette_hexes_reads_rich_entries():
    palette = [
        {"hex": "#ff0000", "rgb": [255, 0, 0], "lab": [53.24, 80.09, 67.2], "weight": 0.6},
        {"hex": "#0000ff", "rgb": [0, 0, 255], "lab": [32.3, 79.19, -107.86], "weight": 0.4},
    ]
    assert palette_hexes(palette) == ["#ff0000", "#0000ff"]


def test_palette_hexes_tolerates_legacy_hex_strings():
    # Rows cached before milestone 5 stored a bare list of hex strings.
    assert palette_hexes(["#ff0000", "#0000ff"]) == ["#ff0000", "#0000ff"]


def test_identical_palettes_have_near_zero_distance():
    p = palette((RED, 0.6), (BLUE, 0.4))
    assert palette_distance(p, p) < 1e-6


def test_closer_palette_scores_lower_than_farther_one():
    seed = palette((RED, 1.0))
    near = palette((RED, 0.5), (GREEN, 0.5))   # contains the exact seed colour
    far = palette((BLUE, 0.5), (GREEN, 0.5))   # no red at all

    assert palette_distance(seed, near) < palette_distance(seed, far)


def test_distance_weights_by_seed_dominance():
    # A candidate that matches the dominant seed colour but misses the minor one
    # beats one that only matches the minor colour.
    seed = palette((RED, 0.9), (BLUE, 0.1))
    matches_dominant = palette((RED, 1.0))
    matches_minor = palette((BLUE, 1.0))

    assert palette_distance(seed, matches_dominant) < palette_distance(seed, matches_minor)


def test_empty_palette_is_infinitely_far():
    p = palette((RED, 1.0))
    assert palette_distance([], p) == float("inf")
    assert palette_distance(p, []) == float("inf")
