from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.base import engine, Base
from app.routers import auth

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Posterboy", version="0.1.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")


@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "ok"}
