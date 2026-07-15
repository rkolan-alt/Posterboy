import httpx
import numpy as np
from io import BytesIO
from PIL import Image
from sklearn.cluster import KMeans

SAMPLE_SIZE = 150  # downsample album art to this many px per side before clustering


def get_dominant_colors(image_url: str, k: int = 5) -> list[str]:
    """
    Extract the k most dominant colors from an album cover image, ordered by
    prevalence (most dominant first). Returns hex color strings (e.g. '#a1b2c3').

    This is a lightweight extraction for poster swatch display. Milestone 5's
    ColorSync feature will build on this with Lab-space conversion and
    CIEDE2000 distance for actual color-similarity ranking between albums.
    """
    response = httpx.get(image_url, timeout=10.0)
    response.raise_for_status()

    image = Image.open(BytesIO(response.content)).convert("RGB")
    image = image.resize((SAMPLE_SIZE, SAMPLE_SIZE))
    pixels = np.array(image).reshape(-1, 3)

    kmeans = KMeans(n_clusters=k, n_init=4, random_state=42)
    labels = kmeans.fit_predict(pixels)
    centers = kmeans.cluster_centers_.astype(int)

    cluster_sizes = np.bincount(labels)
    order = np.argsort(-cluster_sizes)  # descending by pixel count (dominance)

    return [_rgb_to_hex(centers[i]) for i in order]


def _rgb_to_hex(rgb: np.ndarray) -> str:
    r, g, b = (int(v) for v in np.clip(rgb, 0, 255))
    return f"#{r:02x}{g:02x}{b:02x}"
