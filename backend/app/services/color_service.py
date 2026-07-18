import httpx
import numpy as np
from io import BytesIO
from PIL import Image
from sklearn.cluster import KMeans
from skimage.color import rgb2lab, deltaE_ciede2000

SAMPLE_SIZE = 150  # downsample album art to this many px per side before clustering
DEFAULT_K = 5


def extract_palette(image_url: str, k: int = DEFAULT_K) -> list[dict]:
    """
    Download an album cover and extract its k dominant colours as a
    dominance-ordered palette (most prevalent first). Each entry carries the
    colour in three forms plus its dominance weight:

        {"hex": "#rrggbb", "rgb": [r, g, b], "lab": [L, a, b], "weight": 0.0-1.0}

    hex/rgb drive the poster swatch strip; lab + weight are the per-album feature
    vector ColorSync's CIEDE2000 similarity ranking (milestone 6) consumes.
    Weights are the fraction of sampled pixels in each cluster and sum to ~1.
    """
    response = httpx.get(image_url, timeout=10.0)
    response.raise_for_status()

    image = Image.open(BytesIO(response.content)).convert("RGB")
    image = image.resize((SAMPLE_SIZE, SAMPLE_SIZE))
    pixels = np.array(image).reshape(-1, 3)

    return palette_from_pixels(pixels, k)


def palette_from_pixels(pixels: np.ndarray, k: int = DEFAULT_K) -> list[dict]:
    """
    Cluster an (N, 3) uint8 RGB pixel array into a dominance-ordered palette.

    Split out from the network fetch so the clustering + colour-space maths can
    be unit-tested on synthetic pixel arrays without hitting Spotify's CDN.
    """
    kmeans = KMeans(n_clusters=k, n_init=4, random_state=42)
    labels = kmeans.fit_predict(pixels)
    centers = np.clip(kmeans.cluster_centers_, 0, 255)

    counts = np.bincount(labels, minlength=k)
    total = int(counts.sum())
    order = np.argsort(-counts)  # descending by pixel count (dominance)

    palette: list[dict] = []
    for i in order:
        rgb = centers[i]
        r, g, b = (int(round(float(v))) for v in rgb)
        # rgb2lab expects an image-shaped array of floats in [0, 1].
        lab = rgb2lab((rgb / 255.0).reshape(1, 1, 3)).reshape(3)
        palette.append(
            {
                "hex": f"#{r:02x}{g:02x}{b:02x}",
                "rgb": [r, g, b],
                "lab": [round(float(v), 3) for v in lab],
                "weight": round(counts[i] / total, 5) if total else 0.0,
            }
        )

    return palette


def palette_hexes(palette: list) -> list[str]:
    """
    Extract just the hex swatches from a palette, tolerating both the rich
    entry shape ({"hex": ...}) and a legacy list-of-hex-strings cache.
    """
    return [entry["hex"] if isinstance(entry, dict) else entry for entry in palette]


def palette_distance(seed: list[dict], candidate: list[dict]) -> float:
    """
    Colour-similarity distance from a seed palette to a candidate palette — the
    ColorSync ranking signal. Lower means the covers look more alike.

    For each seed colour we find its nearest candidate colour in CIE-Lab space
    (CIEDE2000, the perceptually-uniform difference metric) and weight that
    distance by the seed colour's dominance, then sum. Using a per-colour
    nearest-neighbour rather than pairing colours by rank means palettes listed
    in a different order still match; weighting by the seed's dominance means a
    candidate must echo the seed's *prominent* colours to score well.

    Asymmetric by construction (seed-driven), which is what we want: we rank
    candidates by how well each reproduces one fixed seed palette. Returns
    +inf if either palette is empty so such albums sort to the bottom.
    """
    if not seed or not candidate:
        return float("inf")

    cand_labs = np.array([c["lab"] for c in candidate], dtype=float)
    total = 0.0
    for s in seed:
        s_lab = np.tile(np.array(s["lab"], dtype=float), (len(cand_labs), 1))
        nearest = float(deltaE_ciede2000(s_lab, cand_labs).min())
        total += s.get("weight", 1.0) * nearest

    return total
