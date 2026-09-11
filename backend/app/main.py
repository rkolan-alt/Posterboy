from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.db.base import engine, Base
from app.routers import auth, library, posters, colorsync, search

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Posterboy", version="0.1.0")

# CORS middleware. In the single-origin production deployment the browser only
# ever talks to this app's own domain, so CORS never triggers; it stays here so
# a separately-hosted dev frontend (frontend_url) still works.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(library.router, prefix="/api")
app.include_router(posters.router, prefix="/api")
app.include_router(colorsync.router, prefix="/api")
app.include_router(search.router, prefix="/api")


@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "ok"}


# --- Serve the built frontend (single-origin production) ---------------------
# The production image copies the Vite build here. In local dev the frontend is
# served by Vite instead, so this block is simply skipped when the dir is absent.
STATIC_DIR = Path(__file__).parent / "static"

if STATIC_DIR.is_dir():
    # Hashed JS/CSS assets — safe to serve straight from disk.
    app.mount(
        "/assets",
        StaticFiles(directory=STATIC_DIR / "assets"),
        name="assets",
    )

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        """Serve real static files (favicon, etc.) and fall back to index.html
        for client-side routes so React Router can handle them on refresh.

        /api and /health are registered above and take precedence; this guard
        keeps an unknown /api/* path a JSON 404 instead of returning the SPA.
        """
        if full_path.startswith("api/") or full_path == "health":
            raise HTTPException(status_code=404, detail="Not found")

        candidate = STATIC_DIR / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")
