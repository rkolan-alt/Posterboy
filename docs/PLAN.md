# Posterboy — Spotify Album Poster Generator

## Context
The user wants to build a tool that connects to a user's Spotify account and generates poster images (in the exact visual style of a reference "vinyl poster" template — see Layout spec below) for their most-listened-to albums. Two generation modes are needed: **Ranked** (top N albums by listening prominence, N = 1–6) and **ColorSync** (top N albums whose cover-art color palette most closely matches a seed album — either the user's #1 ranked album, or an album they search for). The user explicitly wants a machine-learning component: color-palette clustering + similarity ranking is that component. The user gave a reference repo (`itsgeorgema/spotify-mood-player`) as a *structural* inspiration only (React/TS frontend + Flask/Python backend + Spotify OAuth), not something to clone — this project's core feature and ML piece are different (color clustering vs. that repo's lyrics/audio-mood classifier). This is a greenfield build. This document is a design plan only — implementation happens in a future session once the user greenlights it.

## Poster layout spec (from reference image)
- Cream/off-white background, thin black poster border
- Large square album cover filling ~65% of the top (album art is fetched as-is from Spotify; any badges/labels on the art are part of the image itself, not added by the tool)
- Vertical black bar on the album art's left edge: album title spelled one letter per line, bold serif/display font, white-on-black, small diamond glyphs separating words
- Thin rule → album title in large bold sans caps (left) + a horizontal strip of ~5 color swatches (the extracted dominant palette) on the same row, right-aligned
- Thin rule → two-column numbered tracklist (bold track number + caps title), columns split ~ceil(n/2)/floor(n/2)
- Footer: bottom-left "ARTIST NAME • YEAR"; bottom-right a wavy/decorative vertical bar pattern (Spotify Code-style visual, purely decorative — not a scannable code)

## Recommended architecture

**Backend: FastAPI (Python)**, not Flask — the workload is I/O-fan-out heavy (parallel Spotify calls, album-art downloads for palette extraction), and `async def` + `httpx.AsyncClient` handles that more cleanly than Flask's sync model. Pydantic gives typed domain models (`AlbumSummary`, `PaletteColor`, `PosterSpec`). Still mirrors the reference repo's good patterns: an isolated `spotify_service.py` for all Spotify Web API calls, a centralized `SCOPE` constant (`user-top-read`, `user-read-private`, `user-read-email` — read-only, no playback scopes needed), environment-aware session-cookie config for cross-origin cookies (Vercel frontend ↔ Fly.io backend).

**Poster rendering: server-side HTML/CSS template rendered via headless-browser screenshot (Playwright)** — not raw Pillow pixel-drawing (too painful to maintain for vertical spine text + 2-column reflow — no layout engine, everything is hand-computed coordinates), and not primarily client-side DOM export via `html-to-image` (CORS on Spotify's CDN images, font-loading races, inconsistent cross-browser fidelity). Instead: build the poster once as an HTML/Jinja2 template with CSS (flexbox handles the two-column tracklist and vertical spine text naturally), screenshot the poster element with Playwright at 2–3x scale for a crisp PNG. This also lets the same pipeline later serve share-links/OG-images without duplicating the template. The frontend gets a **structurally-matching** React component (`PosterTemplate.tsx`) for live in-browser preview, but the actual downloadable PNG is always rendered server-side for consistency.

**ColorSync (the ML piece): k-means palette extraction + CIEDE2000 similarity.**
1. Download small album art (~150×150), run `scikit-learn KMeans(n_clusters=5)` on the RGB pixel array (explicit k-means, not a black-box helper lib, since this is the deliberate "ML" component).
2. Convert the 5 cluster-center colors to Lab space via `scikit-image`'s `rgb2lab` (avoid `colormath` — unmaintained, breaks on newer numpy).
3. Sort colors by cluster pixel-count (dominance) → this ordered Lab-color list is the album's palette feature vector; cache it per album ID (immutable content, compute once).
4. Similarity score between two albums = sum of each seed-palette color's *weighted nearest-neighbor* CIEDE2000 distance to the candidate's palette (handles palettes being in different color-order, avoids needing full Earth Mover's Distance).
5. Rank the user's own library albums by ascending distance to the seed; return top N. Only the seed may be external (via Spotify album search) — recommended posters always come from the user's library, per the user's requirement.

**Ranking (Ranked mode): reciprocal-rank scoring over Spotify's Top Items API** — per the user's explicit choice, use `/me/top/tracks?time_range=medium_term&limit=50` (not manual playlist tallying) as the primary signal, since Spotify already returns tracks pre-ranked by listening affinity.
- For each track at position `i` (0-indexed), weight = `1/(i+1)` (reciprocal rank).
- Group by `album.id`, sum weights per album → album score.
- Sort descending, take top N (1–6, user-selected) for Ranked-mode posters.
- `time_range` (short/medium/long_term) exposed as a UI toggle, default `medium_term`. Multi-range blending is a v2 nice-to-have, not required for v1.
- Fetch full album metadata (tracklist, release date) only for the top N albums via batched `GET /albums?ids=...`, not for all 50 tracks' albums.

**Auth: server-side session, referenced by an opaque HttpOnly cookie** (not JWT — Spotify's access/refresh token pair needs a reliable server-side home for refresh updates; stuffing them into a JWT buys nothing). On OAuth callback, exchange code → tokens, store in `users` table (encrypt refresh token at rest), set a signed session-ID cookie. A dependency checks token `expires_at` before any Spotify call and transparently refreshes if needed. Cookie `SameSite`/`Secure` flags driven by env var, since local dev (same-site, different ports) and prod (Vercel↔Fly.io, cross-site) need different settings — directly reuses the reference repo's insight here.

**Database: Postgres** (Fly Postgres, co-located with backend). Key tables:
- `users` — spotify_user_id, display_name, encrypted access/refresh tokens, token_expires_at
- `top_tracks_cache` — user_id, time_range, jsonb payload, TTL ~1hr (cheap to refetch, avoid hammering Spotify on every page load)
- `albums` — shared cache, spotify album id (pk), name, artist, image_url, explicit flag, tracklist jsonb, spotify_uri — effectively permanent, not user-specific
- `album_palettes` — album_id (fk), palette jsonb (5× {rgb, lab, weight}), computed_at — separately cacheable from basic metadata since it's the expensive step
- `poster_generations` (optional, for history) — user_id, album_id, mode, rank_position, seed_album_id, created_at

**API endpoints:**
- Auth: `GET /api/auth/login`, `GET /api/auth/callback`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/library/top-albums?time_range=&limit=` — Ranked mode list
- `GET /api/posters/{album_id}` — PosterSpec JSON (for preview); `GET /api/posters/{album_id}/render.png` — triggers Playwright render, streams PNG
- `GET /api/colorsync/recommendations?seed_album_id=&limit=` — seed defaults to caller's #1 ranked album if omitted
- `GET /api/search/albums?q=` — thin proxy to Spotify album search, powers the ColorSync seed picker

**Frontend: React + TypeScript + Vite** (matches reference stack), React Query for API caching.
- Pages: `LoginPage`, `CallbackPage`, `DashboardPage` (mode toggle, N-selector 1–6, time_range selector, seed-album picker, poster grid)
- Components: `PosterTemplate` (visual spec, mirrors server template), `PosterCard` (grid thumbnail + loading state), `ColorSwatchStrip`, `AlbumSearchPicker`, small controlled form inputs
- `downloadPoster(albumId)` — thin helper that hits `.../render.png` and triggers a download (actual PNG generation is server-side)

**Deployment:** Vercel (frontend) + Fly.io (backend, **Docker image based on `mcr.microsoft.com/playwright/python`** for the bundled Chromium needed by rendering) + Fly Postgres. GitHub Actions: lint/typecheck+build for frontend (Vercel auto-deploys via its GitHub integration), lint/typecheck/test+`flyctl deploy` for backend. Required secrets: `SPOTIFY_CLIENT_ID/SECRET`, `SESSION_SECRET`, `DATABASE_URL`, `FLY_API_TOKEN`, `VITE_API_BASE_URL`.

## Prerequisite manual setup (before any OAuth code can run)
1. Register a Spotify Developer App at developer.spotify.com/dashboard → get Client ID/Secret.
2. Add redirect URIs: `http://127.0.0.1:5173/callback` (dev — Spotify requires `127.0.0.1`, not `localhost`) and the prod callback URL.
3. Dev-mode apps are capped at 25 allow-listed Spotify accounts; note this if the user wants broader public access later (requires Spotify's extended-quota review).
4. `.env.example` should list: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`, `SESSION_SECRET`, `DATABASE_URL`, `FRONTEND_URL`, `COOKIE_SECURE`, `COOKIE_SAMESITE`.

## Critical files (once implementation starts)
- `backend/app/services/spotify_service.py` — all Spotify Web API calls, isolated (top tracks, album batch fetch, search, token refresh)
- `backend/app/services/ranking_service.py` — reciprocal-rank album scoring (Ranked mode)
- `backend/app/services/color_service.py` — k-means palette extraction + CIEDE2000 similarity ranking (ColorSync / the ML component)
- `backend/app/templates/poster.html` + `backend/app/services/poster_render_service.py` — the visual template and Playwright render pipeline
- `backend/app/core/session.py` — session cookie + token storage/refresh
- `frontend/src/components/PosterTemplate.tsx` — client-side mirror of the poster visual spec for live preview

## Suggested build order
1. **Scaffolding + auth** — repo structure, Postgres/Alembic, full OAuth login→callback→session→refresh flow, verify `/api/auth/me` works cross-origin. (Riskiest infra piece — get this solid first.)
2. **Ranked-mode data pipeline** — `spotify_service`, `ranking_service`, caching, `GET /api/library/top-albums`; hand-verify against a real account's known listening habits.
3. **Poster template + rendering** — build the HTML/CSS template against hardcoded sample data first, get visual fidelity right, wire up Playwright, ship `poster_service` + render endpoints.
4. **Frontend dashboard (Ranked mode)** — full usable product for Ranked mode end to end.
5. **Color extraction + palette caching** — `color_service`, `album_palettes` table; sanity-check extracted swatches against known album art before wiring into ranking.
6. **ColorSync mode** — recommendations endpoint, album search, seed picker UI.
7. **Deployment + CI** — Dockerize (Playwright base image), Fly.io + Vercel + GitHub Actions, prod Spotify redirect URI, end-to-end smoke test.
8. **Polish (stretch)** — generation history, multi-time-range blended ranking, batch ZIP download, share links.

## Verification (once built)
- Manual end-to-end run with a real Spotify test account: login → Ranked mode (multiple N and time_range values) → ColorSync mode (both with and without a seed album) → confirm poster visuals match the reference layout exactly (spine text, swatch strip, 2-column tracklist, decorative wavy barcode) → confirm PNG download quality.
- Unit tests for `ranking_service` (reciprocal-rank scoring against fixture top-tracks data) and `color_service` (CIEDE2000 distance/ranking against fixture palettes).
- Confirm token refresh works by forcing an expired token and checking a subsequent API call transparently refreshes rather than erroring.
- Confirm cross-origin cookie behavior in an actual deployed environment (Vercel + Fly.io), not just localhost, before considering auth done.
