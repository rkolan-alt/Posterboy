# Posterboy

Posterboy turns your Spotify listening history into printable album posters.

Log in with Spotify, pick how you want your albums chosen, and the app renders
each one as a poster in a vinyl-record style: the album art, a vertical spine
with the title set one letter per line, the cover's dominant colour palette as a
strip of swatches, a two-column numbered tracklist, and the artist and year along
the footer. Every poster is downloadable as a high-resolution PNG.

## How albums get chosen

Three selection strategies, each a different answer to "which albums are *yours*":

**Top tracks (ranked).** Uses Spotify's own listening-affinity ranking from
`/me/top/tracks`. Each track at position `i` contributes `1/(i+1)` to its album's
score, so a top-5 track counts for far more than a 50th. Scores are summed per
album and sorted. Time range (short/medium/long term) is selectable.

**Library frequency.** Ranks albums by how many of their songs appear in your
library, deduplicated by track ID so the same song in five playlists counts once.
You can scope this to specific playlists and exclude Liked Songs — useful when
your Liked Songs are a grab bag that drowns out the albums you actually care
about.

**ColorSync.** Pick a seed album — your top-ranked one, or any album found via
Spotify search — and get back the albums from *your* library whose cover art is
closest in colour. This is the machine-learning piece, described below.

## How ColorSync works

1. **Palette extraction.** Album art is downloaded small (~150×150) and its
   pixels clustered with `KMeans(n_clusters=5)`. The five cluster centres are the
   album's dominant colours, ordered by how many pixels each cluster claimed.
2. **Perceptual colour space.** RGB is not perceptually uniform — equal numeric
   distances don't look equally different — so each colour is converted to CIE
   Lab via `rgb2lab`.
3. **Similarity scoring.** Distance between two albums is the sum of each seed
   colour's weighted nearest-neighbour CIEDE2000 distance to the candidate's
   palette. Nearest-neighbour matching means palettes don't have to list their
   colours in the same order to match; weighting by dominance means a palette's
   main colour matters more than its fifth.
4. **Ranking.** Candidates are the top 40 albums from your library ranking, scored
   and sorted ascending. The pool is capped because a cold palette extraction is
   a k-means fit over a downloaded image — unbounded, it would take minutes.

Palettes are cached per album in Postgres. Album art never changes, so each album
is clustered once, ever, across all users.

## Tech stack and what each piece does

### Frontend
| Tool | Role |
|---|---|
| **React 18 + TypeScript** | UI components and the poster preview. `PosterTemplate.tsx` mirrors the server-side poster template so previews match the downloaded PNG. |
| **Vite** | Dev server and production bundler. `npm run build` runs `tsc -b && vite build`, so the build doubles as the type check. |
| **React Router** | Client-side routing across login, OAuth callback, mode select, dashboard, and ColorSync pages. |

### Backend
| Tool | Role |
|---|---|
| **FastAPI** | HTTP API. Chosen over Flask because the workload is I/O fan-out — parallel Spotify calls and album-art downloads. |
| **Uvicorn** | ASGI server running the app. |
| **httpx** | HTTP client for every Spotify Web API call, isolated in `spotify_service.py`. |
| **Pydantic + pydantic-settings** | Request/response validation and typed environment config. |
| **SQLAlchemy 2** | ORM and schema definition over Postgres. |
| **itsdangerous + cryptography** | Signs the session cookie; encrypts Spotify refresh tokens at rest. |
| **pytest** | Test suite covering the pure logic — ranking maths and colour distance. No database or browser required. |

### Poster rendering
| Tool | Role |
|---|---|
| **Jinja2** | Renders `templates/poster.html`, the single source of truth for poster layout. CSS flexbox handles the two-column tracklist and vertical spine text that would be painful to hand-compute in a drawing library. |
| **Playwright (headless Chromium)** | Screenshots the rendered `.poster` element at 2× device scale for a crisp PNG. Also measures real text layout to shrink the tracklist font until long track names fit without truncating. |
| **Pillow** | Image loading for palette extraction. |

### Machine learning
| Tool | Role |
|---|---|
| **scikit-learn** | `KMeans` clustering to extract each album's five dominant colours. |
| **scikit-image** | `rgb2lab` for perceptual colour space; `deltaE_ciede2000` for perceptual colour difference. |
| **NumPy** | Array maths underlying both. |

### Data
| Tool | Role |
|---|---|
| **PostgreSQL** | Users and encrypted tokens, cached top tracks (short TTL), shared album metadata and tracklists, and cached colour palettes. Neon hosts the production instance. |

Schema is created by `Base.metadata.create_all()` at import. Alembic is installed
but not yet wired up — see *Schema changes* below.

### Infrastructure
| Tool | Role |
|---|---|
| **Docker** | Multi-stage build: stage one builds the frontend, stage two installs Python dependencies plus Chromium and serves both from one process. |
| **Google Cloud Run** | Hosts the container. Runs on the gen2 execution environment with 2Gi so Chromium gets a `/dev/shm` sized to the memory limit. Scales to zero when idle. |
| **Artifact Registry** | Stores built images, tagged with the commit SHA. |
| **Secret Manager** | Holds Spotify credentials, the session secret, and the database URL; injected as environment variables at runtime. |
| **GitHub Actions** | CI and deploy. Pull requests run tests and the build; pushes to `main` additionally build, push, and roll out a revision behind a `/health` smoke test. |
| **Workload Identity Federation** | Lets Actions authenticate to Google Cloud by exchanging its OIDC token, pinned by attribute condition to this repository — so no service-account key is stored in the repo. |

## Architecture

The production deployment is **single-origin**: one FastAPI process serves both
the API and the built frontend. The browser therefore never makes a cross-origin
request, and the session cookie stays a plain first-party `SameSite=Lax` cookie
with no CORS configuration to get wrong.

Authentication is a server-side session referenced by an opaque HttpOnly cookie,
not a JWT — Spotify's access/refresh token pair needs a reliable server-side home
so refreshes can be written back. A dependency checks token expiry before any
Spotify call and refreshes transparently.

```
backend/app/
  routers/     auth, library, colorsync, posters, search endpoints
  services/    spotify, ranking, color, palette, poster, poster_render
  core/        config, session, security, dependencies
  db/          SQLAlchemy models and engine
  templates/   poster.html — the poster layout
frontend/src/
  pages/       login, callback, mode select, dashboard, colorsync
  components/  PosterTemplate, PosterCard, PlaylistSelector, LoadingModule
  lib/         api client, grid layout, timing helpers
```

## Running locally

```bash
cp backend/.env.example backend/.env    # fill in your Spotify credentials
cp frontend/.env.example frontend/.env
docker compose up
```

Frontend on `http://127.0.0.1:5173`, API on `http://127.0.0.1:8000`, Postgres on
`5433`. Use `127.0.0.1` rather than `localhost` — Spotify requires it in redirect
URIs.

You will need a Spotify app from the [developer dashboard][dash] with
`http://127.0.0.1:5173/callback` on its redirect URI allowlist. Apps in
development mode are limited to 25 allowlisted listeners.

[dash]: https://developer.spotify.com/dashboard

## Deploying

Pushing to `main` builds and deploys automatically. First-time cloud setup — the
GCP project, registry, secrets, and keyless CI auth — is documented in
[`docs/DEPLOY.md`](docs/DEPLOY.md).

### Schema changes

`create_all()` only creates tables that don't yet exist; it never alters an
existing one. Adding a table is safe, but **adding a column to an existing model
will not reach the deployed database**. Until Alembic is wired up, new data
belongs in a new table or inside an existing `JSONB` payload — the approach
`db/models.py` already takes for cached palettes.
