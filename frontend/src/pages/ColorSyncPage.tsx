import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getMe,
  logout,
  searchAlbums,
  getColorSyncRecommendations,
} from '../lib/api'
import type { AlbumSearchResult, ColorSyncResult } from '../lib/api'
import { gridLayout, MAX_ALBUMS, CARD_PX, GAP_PX } from '../lib/gridLayout'
import PosterCard from '../components/PosterCard'

interface User {
  spotify_user_id: string
  display_name: string | null
}

export default function ColorSyncPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // null seed = match against the user's own #1 library album (the default).
  const [seedAlbumId, setSeedAlbumId] = useState<string | null>(null)
  const [limit, setLimit] = useState(6)

  const [result, setResult] = useState<ColorSyncResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<AlbumSearchResult[] | null>(null)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => navigate('/'))
      .finally(() => setAuthLoading(false))
  }, [navigate])

  // Fetch the max and slice client-side: the N closest matches are a prefix of
  // the 6 closest, so changing N never needs a refetch — which matters here
  // because a fresh seed re-extracts palettes for the whole candidate pool.
  useEffect(() => {
    if (!user) return
    let ignore = false
    setLoading(true)
    setError(null)

    getColorSyncRecommendations(seedAlbumId, MAX_ALBUMS)
      .then((res) => {
        if (!ignore) setResult(res)
      })
      .catch((err: Error) => {
        if (!ignore) setError(err.message || 'Could not load colour matches.')
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [user, seedAlbumId])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    try {
      setSearchResults(await searchAlbums(query.trim()))
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const pickSeed = (albumId: string) => {
    setSeedAlbumId(albumId)
    setSearchResults(null)
    setQuery('')
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  if (authLoading) return <div>Loading...</div>

  const albums = result ? result.albums.slice(0, limit) : []
  const layout = gridLayout(albums.length)

  return (
    <div style={{ textAlign: 'left', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5em' }}>
        <div>
          <h1 style={{ margin: 0 }}>ColorSync</h1>
          <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9em' }}>
            Albums whose cover art matches a seed album's colour palette
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5em' }}>
          <button onClick={() => navigate('/modes')}>← Modes</button>
          <button onClick={handleLogout}>Log out</button>
        </div>
      </div>

      {/* Seed picker */}
      <div style={{ marginBottom: '1.5em' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5em', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a seed album…"
            style={{ padding: '0.5em', minWidth: 260, flex: '0 1 320px' }}
          />
          <button type="submit" disabled={searching}>
            {searching ? 'Searching…' : 'Search'}
          </button>
          {seedAlbumId && (
            <button type="button" onClick={() => setSeedAlbumId(null)}>
              Use my top album
            </button>
          )}
          <label style={{ marginLeft: 'auto' }}>
            Albums:{' '}
            <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
              {Array.from({ length: MAX_ALBUMS }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </form>

        {searchResults && (
          <div style={{ marginTop: '0.75em', border: '1px solid #444', borderRadius: 8, maxHeight: 260, overflowY: 'auto' }}>
            {searchResults.length === 0 ? (
              <p style={{ padding: '0.75em', margin: 0, opacity: 0.7 }}>No albums found.</p>
            ) : (
              searchResults.map((a) => (
                <button
                  key={a.album_id}
                  onClick={() => pickSeed(a.album_id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75em', width: '100%',
                    padding: '0.5em', background: 'transparent', border: 'none',
                    borderBottom: '1px solid #333', cursor: 'pointer', textAlign: 'left', color: 'inherit',
                  }}
                >
                  <div style={{ width: 44, height: 44, flex: 'none', borderRadius: 4, background: a.image_url ? `center / cover url(${a.image_url})` : '#333' }} />
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                    <div style={{ opacity: 0.7, fontSize: '0.85em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.artist_name}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Current seed */}
      {result && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1em', marginBottom: '1.5em', padding: '0.75em', border: '1px solid #333', borderRadius: 8 }}>
          <div style={{ width: 64, height: 64, flex: 'none', borderRadius: 4, background: result.seed.image_url ? `center / cover url(${result.seed.image_url})` : '#333' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ opacity: 0.6, fontSize: '0.8em' }}>Matching to</div>
            <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.seed.name}</div>
            <div style={{ opacity: 0.75, fontSize: '0.9em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.seed.artist_name}</div>
          </div>
          <div style={{ display: 'flex', height: 28, borderRadius: 4, overflow: 'hidden', flex: 'none' }}>
            {result.seed.palette.map((hex, i) => (
              <div key={i} style={{ width: 28, background: hex }} title={hex} />
            ))}
          </div>
        </div>
      )}

      {loading && <p>Extracting palettes and finding colour matches… (first run can take a bit)</p>}
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      {!loading && !error && result && albums.length === 0 && (
        <p>No colour matches found in your library.</p>
      )}

      {!loading && !error && albums.length > 0 && (
        <>
          <p style={{ opacity: 0.6, fontSize: '0.8em', marginTop: 0 }}>
            ΔE is the perceptual colour distance to the seed — lower is a closer match.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
              gap: `${GAP_PX}px`,
              maxWidth: layout.realCols * CARD_PX + (layout.realCols - 1) * GAP_PX,
              margin: '0 auto',
            }}
          >
            {albums.map((album, i) => (
              <div key={album.album_id} style={layout.placeFor(i)}>
                <PosterCard album={album} caption={`ΔE ${album.distance.toFixed(1)}`} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
