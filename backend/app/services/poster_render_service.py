from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from playwright.sync_api import sync_playwright

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
_env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))

POSTER_WIDTH = 1000
DEVICE_SCALE_FACTOR = 2  # renders at 2x for a crisp downloadable PNG

TRACKLIST_MAX_FONT_PX = 17
TRACKLIST_MIN_FONT_PX = 12

# Shrinks the tracklist's font-size in 0.5px steps until every track name
# fits its column without truncating (measured via real layout in the
# headless browser, so it's exact for whatever font actually renders -
# no character-width guessing needed). Albums with short track names keep
# the default size; only albums with long names shrink. Floors at
# TRACKLIST_MIN_FONT_PX and leaves the CSS ellipsis as a fallback for any
# name still too long even at the minimum size.
_SHRINK_TRACKLIST_TO_FIT_JS = f"""
() => {{
  const tracklist = document.querySelector('.tracklist');
  const names = Array.from(document.querySelectorAll('.track-name'));
  if (!tracklist || names.length === 0) return;

  const fits = () => names.every((el) => el.scrollWidth <= el.clientWidth + 1);

  let size = {TRACKLIST_MAX_FONT_PX};
  tracklist.style.fontSize = size + 'px';
  while (!fits() && size > {TRACKLIST_MIN_FONT_PX}) {{
    size -= 0.5;
    tracklist.style.fontSize = size + 'px';
  }}
}}
"""


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
        page.evaluate(_SHRINK_TRACKLIST_TO_FIT_JS)
        png_bytes = page.locator(".poster").screenshot()
        browser.close()

    return png_bytes
