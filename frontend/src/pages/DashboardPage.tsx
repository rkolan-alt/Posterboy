import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe, getLibraryAlbums, getTopAlbums, logout } from '../lib/api'
import type { RankedAlbum, TimeRange } from '../lib/api'
import { gridLayout, MAX_ALBUMS, CARD_PX, GAP_PX } from '../lib/gridLayout'
import PosterCard from '../components/PosterCard'

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

  const [albums, setAlbums] = useState<RankedAlbum[]>([])
  const [albumsLoading, setAlbumsLoading] = useState(false)
  const [albumsError, setAlbumsError] = useState<string | null>(null)

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => navigate('/'))
      .finally(() => setAuthLoading(false))
  }, [navigate])

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

    const fetchAlbums =
      mode === 'library' ? getLibraryAlbums(MAX_ALBUMS) : getTopAlbums(timeRange, MAX_ALBUMS)

    fetchAlbums
      .then((result) => {
        if (!ignore) setAlbums(result)
      })
      .catch((err: Error) => {
        if (!ignore) setAlbumsError(err.message || 'Could not load your albums. Try again.')
      })
      .finally(() => {
        if (!ignore) setAlbumsLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [user, mode, timeRange])

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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1em', alignItems: 'center', marginBottom: '1.5em' }}>
        <label>
          Rank by:{' '}
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            <option value="library">Full library (liked songs + playlists)</option>
            <option value="top">Recently played</option>
          </select>
        </label>

        {mode === 'top' && (
          <label>
            Time range:{' '}
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as TimeRange)}>
              <option value="short_term">Last 4 weeks</option>
              <option value="medium_term">Last 6 months</option>
              <option value="long_term">All time</option>
            </select>
          </label>
        )}

        <label>
          Albums:{' '}
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            {Array.from({ length: MAX_ALBUMS }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      {albumsLoading && <p>Loading your top albums…</p>}
      {albumsError && <p style={{ color: '#f87171' }}>{albumsError}</p>}
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
            gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
            gap: `${GAP_PX}px`,
            maxWidth: layout.realCols * CARD_PX + (layout.realCols - 1) * GAP_PX,
            margin: '0 auto',
          }}
        >
          {visibleAlbums.map((album, i) => (
            <div key={album.album_id} style={layout.placeFor(i)}>
              <PosterCard album={album} caption={`${album.track_count} songs`} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
