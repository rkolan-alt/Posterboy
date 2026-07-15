from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from playwright.sync_api import sync_playwright

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
_env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))

POSTER_WIDTH = 1000
DEVICE_SCALE_FACTOR = 2  # renders at 2x for a crisp downloadable PNG


def render_poster_html(spec: dict) -> str:
    template = _env.get_template("poster.html")
    return template.render(**spec)


def render_poster_png(spec: dict) -> bytes:
    """
    Render the poster template to a PNG via a headless Chromium screenshot.
    The poster's height is content-driven (varies with track count), so we
    screenshot the .poster element directly rather than fixing a viewport
    height - Playwright captures the full element bounding box regardless.
    """
    html = render_poster_html(spec)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(
            viewport={"width": POSTER_WIDTH, "height": 800},
            device_scale_factor=DEVICE_SCALE_FACTOR,
        )
        page.set_content(html, wait_until="networkidle")
        png_bytes = page.locator(".poster").screenshot()
        browser.close()

    return png_bytes
