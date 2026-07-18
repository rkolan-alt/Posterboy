// Empty base = same-origin relative requests, proxied to the backend by Vite
// (see vite.config.ts). Keeps the session cookie first-party and CORS-free.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export async function apiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_BASE_URL}/api${endpoint}`

  return fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })
}

export async function getMe() {
  const response = await apiCall('/auth/me')
  if (!response.ok) {
    throw new Error('Failed to fetch user')
  }
  return response.json()
}

export async function logout() {
  await apiCall('/auth/logout', { method: 'POST' })
}

export interface RankedAlbum {
  rank: number
  score: number
  track_count: number
  album_id: string
  name: string
  artist_name: string
  release_date: string | null
  image_url: string | null
  total_tracks: number | null
  spotify_uri: string
}

export type TimeRange = 'short_term' | 'medium_term' | 'long_term'

/** Prefer the server's own message (e.g. Spotify's rate limit and how long it
 *  lasts) over a generic one, so the UI can say what actually went wrong. */
async function errorFrom(response: Response, fallback: string): Promise<Error> {
  try {
    const body = await response.json()
    return new Error(typeof body?.detail === 'string' ? body.detail : fallback)
  } catch {
    return new Error(fallback)
  }
}

export async function getLibraryAlbums(limit: number): Promise<RankedAlbum[]> {
  const response = await apiCall(`/library/library-albums?limit=${limit}`)
  if (!response.ok) {
    throw await errorFrom(response, 'Failed to fetch library albums')
  }
  const data = await response.json()
  return data.albums
}

export async function getTopAlbums(timeRange: TimeRange, limit: number): Promise<RankedAlbum[]> {
  const response = await apiCall(`/library/top-albums?time_range=${timeRange}&limit=${limit}`)
  if (!response.ok) {
    throw await errorFrom(response, 'Failed to fetch top albums')
  }
  const data = await response.json()
  return data.albums
}

export interface AlbumSearchResult {
  album_id: string
  name: string
  artist_name: string
  image_url: string | null
  release_date: string | null
}

export async function searchAlbums(query: string): Promise<AlbumSearchResult[]> {
  const response = await apiCall(`/search/albums?q=${encodeURIComponent(query)}`)
  if (!response.ok) {
    throw await errorFrom(response, 'Album search failed')
  }
  const data = await response.json()
  return data.albums
}

/** An album returned by ColorSync, ranked by cover-art colour match to the seed. */
export interface ColorSyncAlbum {
  rank: number
  distance: number
  album_id: string
  name: string
  artist_name: string
  release_date: string | null
  image_url: string | null
  total_tracks: number | null
  spotify_uri: string
}

export interface ColorSyncSeed {
  album_id: string
  name: string
  artist_name: string
  image_url: string | null
  palette: string[]
}

export interface ColorSyncResult {
  seed: ColorSyncSeed
  albums: ColorSyncAlbum[]
}

export async function getColorSyncRecommendations(
  seedAlbumId: string | null,
  limit: number
): Promise<ColorSyncResult> {
  const seedParam = seedAlbumId ? `&seed_album_id=${seedAlbumId}` : ''
  const response = await apiCall(`/colorsync/recommendations?limit=${limit}${seedParam}`)
  if (!response.ok) {
    throw await errorFrom(response, 'Failed to load colour matches')
  }
  return response.json()
}

export interface PosterTrack {
  track_number: number
  name: string
  duration_ms: number
  num_display: string
}

/** Shape returned by GET /api/posters/{id}; consumed by PosterTemplate. */
export interface PosterSpec {
  album_id: string
  title: string
  artist: string
  year: string
  image_url: string | null
  spine_lines: { type: 'letter' | 'sep'; value: string }[]
  palette: string[]
  col1: PosterTrack[]
  col2: PosterTrack[]
}

export async function getPosterSpec(albumId: string): Promise<PosterSpec> {
  const response = await apiCall(`/posters/${albumId}`)
  if (!response.ok) {
    throw await errorFrom(response, 'Failed to load poster preview')
  }
  return response.json()
}

/** Fetches the server-rendered poster PNG and triggers a browser download. */
export async function downloadPoster(albumId: string, filename: string): Promise<void> {
  const response = await apiCall(`/posters/${albumId}/render.png`)
  if (!response.ok) {
    throw new Error('Failed to render poster')
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
