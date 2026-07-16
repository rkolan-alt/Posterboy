// Empty base = same-origin relative requests, proxied to the backend by Vite
// (see vite.config.ts). Keeps the session cookie first-party and CORS-free.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

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

export async function getLibraryAlbums(limit: number): Promise<RankedAlbum[]> {
  const response = await apiCall(`/library/library-albums?limit=${limit}`)
  if (!response.ok) {
    throw new Error('Failed to fetch library albums')
  }
  const data = await response.json()
  return data.albums
}

export async function getTopAlbums(timeRange: TimeRange, limit: number): Promise<RankedAlbum[]> {
  const response = await apiCall(`/library/top-albums?time_range=${timeRange}&limit=${limit}`)
  if (!response.ok) {
    throw new Error('Failed to fetch top albums')
  }
  const data = await response.json()
  return data.albums
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
