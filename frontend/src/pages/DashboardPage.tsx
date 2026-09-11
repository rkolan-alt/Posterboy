import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe, getLibraryAlbums, getTopAlbums, getPlaylists, logout } from '../lib/api'
import type { RankedAlbum, TimeRange, Playlist } from '../lib/api'
import { gridLayout, MAX_ALBUMS, CARD_PX, GAP_PX } from '../lib/gridLayout'
import PosterCard from '../components/PosterCard'
import LoadingModule from '../components/LoadingModule'
import PlaylistSelector from '../components/PlaylistSelector'
import { afterMinDuration } from '../lib/timing'

interface User {
  id: string
  spotify_user_id: string
  display_name: string | null
  email: string | null
}

type Mode = 'library' | 'top'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [mode, setMode] = useState<Mode>('library')
  const [limit, setLimit] = useState(6)
  const [timeRange, setTimeRange] = useState<TimeRange>('medium_term')
  const [excludeLiked, setExcludeLiked] = useState(false)

  // null = all playlists (default). Only used in library mode.
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<string[] | null>(null)

  const [albums, setAlbums] = useState<RankedAlbum[]>([])
  const [albumsLoading, setAlbumsLoading] = useState(false)
  const [albumsError, setAlbumsError] = useState<string | null>(null)

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => navigate('/'))
      .finally(() => setAuthLoading(false))
  }, [navigate])

  // Load the playlist list once for the selector (best-effort; the selector just
  // shows "none found" if it fails, and ranking still works over all playlists).
  useEffect(() => {
    if (!user) return
    getPlaylists()
      .then(setPlaylists)
      .catch(() => setPlaylists([]))
  }, [user])

  // Always fetch the maximum and truncate client-side. `limit` only shortens an
  // already-ranked list, so the top 4 are the first 4 of the top 6 — refetching
  // would just re-run a ~7s Spotify crawl to show a subset we already hold.
  // `ignore` drops responses from a superseded mode/timeRange so a slow earlier
  // request cannot land after a newer one and overwrite it.
  useEffect(() => {
    if (!user) return
    let ignore = false
    setAlbumsLoading(true)
    setAlbumsError(null)
    const started = Date.now()

    const fetchAlbums =
      mode === 'library'
        ? getLibraryAlbums(MAX_ALBUMS, excludeLiked, selectedPlaylistIds)
        : getTopAlbums(timeRange, MAX_ALBUMS)

    fetchAlbums
      .then((result) => {
        if (!ignore) setAlbums(result)
      })
      .catch((err: Error) => {
        if (!ignore) setAlbumsError(err.message || 'Could not load your albums. Try again.')
      })
      .finally(async () => {
        // Keep the spinner up for a readable minimum even on cached fetches.
        await afterMinDuration(started)
        if (!ignore) setAlbumsLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [user, mode, timeRange, excludeLiked, selectedPlaylistIds])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  if (authLoading) {
    return <div>Loading...</div>
  }

  const visibleAlbums = albums.slice(0, limit)
  const layout = gridLayout(visibleAlbums.length)

  return (
    <div style={{ textAlign: 'left', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5em' }}>
        <div>
          <h1 style={{ margin: 0 }}>Posterboy</h1>
          <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9em' }}>
            {user?.display_name || user?.spotify_user_id}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5em' }}>
          <button onClick={() => navigate('/modes')}>← Modes</button>
          <button onClick={handleLogout}>Log out</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1em', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5em' }}>
        <label className="control-label">
          Rank by:
          <select className="control-pill" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            <option value="library">Full library (liked songs + playlists)</option>
            <option value="top">Recently played</option>
          </select>
        </label>

        {mode === 'top' && (
          <label className="control-label">
            Time range:
            <select className="control-pill" value={timeRange} onChange={(e) => setTimeRange(e.target.value as TimeRange)}>
              <option value="short_term">Last 4 weeks</option>
              <option value="medium_term">Last 6 months</option>
              <option value="long_term">All time</option>
            </select>
          </label>
        )}

        <label className="control-label">
          Albums:
          <select className="control-pill" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            {Array.from({ length: MAX_ALBUMS }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        {/* Playlist scope + Liked Songs toggle only apply to the full-library
            crawl; "Recently played" (top) mode uses neither. */}
        {mode === 'library' && (
          <>
            <PlaylistSelector
              playlists={playlists}
              selected={selectedPlaylistIds}
              onChange={setSelectedPlaylistIds}
            />
            <label className="control-label" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={excludeLiked}
                onChange={(e) => setExcludeLiked(e.target.checked)}
              />
              Exclude liked songs
            </label>
          </>
        )}
      </div>

      {albumsError && <p style={{ color: '#f87171' }}>{albumsError}</p>}
      {albumsLoading && <LoadingModule label="Ranking your albums…" />}
      {!albumsLoading && !albumsError && albums.length === 0 && (
        <p>No albums found. Try a different mode, or listen to more music on Spotify first.</p>
      )}

      {/* Hidden while loading: a mode or time-range change returns a different
          set of albums, so leaving the previous ones on screen for the length of
          the fetch just shows the user stale data. */}
      {!albumsLoading && !albumsError && visibleAlbums.length > 0 && (
        <div
          style={{
            display: 'grid',
            // minmax(0, 1fr), not 1fr: plain 1fr is minmax(auto, 1fr), whose
            // auto floor lets a card's min-content width expand its column. A
            // long, unbreakable album title would then widen its whole column —
            // and since columns span every row, drag the other card in that
            // column wider too, blowing up its poster.
            gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
            gap: `${GAP_PX}px`,
            maxWidth: layout.realCols * CARD_PX + (layout.realCols - 1) * GAP_PX,
            margin: '0 auto',
          }}
        >
          {visibleAlbums.map((album, i) => (
            <div key={album.album_id} style={{ ...layout.placeFor(i), minWidth: 0 }}>
              <PosterCard album={album} caption={`${album.track_count} songs`} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
