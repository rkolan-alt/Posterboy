# Production image: builds the React frontend, then serves it and the API from
# a single FastAPI process (single-origin). Used by Fly.io; local dev still uses
# the per-service Dockerfiles in backend/ and frontend/ via docker-compose.
#
# Build context is the repo root: `docker build -t posterboy .`

# --- Stage 1: build the frontend ---------------------------------------------
FROM node:20-alpine AS frontend
WORKDIR /fe

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
# Same-origin in prod: no VITE_API_BASE_URL, so the app makes relative /api calls.
RUN npm run build

# --- Stage 2: backend + static frontend --------------------------------------
FROM python:3.13-slim-bookworm
WORKDIR /app

# libpq for psycopg2; gcc for any source builds during pip install.
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Chromium (+ its OS deps) for the Playwright poster renderer.
RUN playwright install --with-deps chromium

COPY backend/ ./
# Drop the Vite build where main.py serves it from (app/static).
COPY --from=frontend /fe/dist ./app/static

EXPOSE 8000
# No --reload in production.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
