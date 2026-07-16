import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe, getLibraryAlbums, getTopAlbums, logout } from '../lib/api'
import type { RankedAlbum, TimeRange } from '../lib/api'
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

  useEffect(() => {
    if (!user) return
    setAlbumsLoading(true)
    setAlbumsError(null)

    const fetchAlbums = mode === 'library' ? getLibraryAlbums(limit) : getTopAlbums(timeRange, limit)

    fetchAlbums
      .then(setAlbums)
      .catch(() => setAlbumsError('Could not load your albums. Try again.'))
      .finally(() => setAlbumsLoading(false))
  }, [user, mode, limit, timeRange])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  if (authLoading) {
    return <div>Loading...</div>
  }

  return (
    <div style={{ textAlign: 'left', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5em' }}>
        <div>
          <h1 style={{ margin: 0 }}>Posterboy</h1>
          <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9em' }}>
            {user?.display_name || user?.spotify_user_id}
          </p>
        </div>
        <button onClick={handleLogout}>Log out</button>
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
            {[1, 2, 3, 4, 5, 6].map((n) => (
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1.5em',
        }}
      >
        {albums.map((album) => (
          <PosterCard key={album.album_id} album={album} />
        ))}
      </div>
    </div>
  )
}
