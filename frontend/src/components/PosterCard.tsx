import { useState } from 'react'
import type { RankedAlbum } from '../lib/api'
import { downloadPoster } from '../lib/api'

export default function PosterCard({ album }: { album: RankedAlbum }) {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    setDownloading(true)
    setError(null)
    try {
      const filename = `${album.artist_name} - ${album.name}.png`.replace(/[/\\]/g, '-')
      await downloadPoster(album.album_id, filename)
    } catch {
      setError('Could not render poster. Try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      style={{
        border: '1px solid #444',
        borderRadius: '8px',
        padding: '1em',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5em',
      }}
    >
      <div style={{ position: 'relative', width: '100%' }}>
        {album.image_url ? (
          <img
            src={album.image_url}
            alt={album.name}
            style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: '4px' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              aspectRatio: '1 / 1',
              background: '#333',
              borderRadius: '4px',
            }}
          />
        )}
        <span
          style={{
            position: 'absolute',
            top: '0.4em',
            left: '0.4em',
            background: 'rgba(0,0,0,0.75)',
            color: '#fff',
            borderRadius: '4px',
            padding: '0.15em 0.5em',
            fontSize: '0.85em',
            fontWeight: 600,
          }}
        >
          #{album.rank}
        </span>
      </div>

      <div style={{ width: '100%' }}>
        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {album.name}
        </div>
        <div style={{ opacity: 0.75, fontSize: '0.9em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {album.artist_name}
        </div>
        <div style={{ opacity: 0.6, fontSize: '0.8em' }}>{album.track_count} songs</div>
      </div>

      <button onClick={handleDownload} disabled={downloading} style={{ width: '100%' }}>
        {downloading ? 'Rendering…' : 'Download Poster'}
      </button>
      {error && <div style={{ color: '#f87171', fontSize: '0.8em' }}>{error}</div>}
    </div>
  )
}
