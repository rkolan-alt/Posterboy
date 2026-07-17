import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RankedAlbum, PosterSpec } from '../lib/api'
import { downloadPoster, getPosterSpec } from '../lib/api'
import PosterTemplate from './PosterTemplate'

// PosterTemplate renders at the Jinja template's natural width; the card scales
// it down from there so the preview keeps the PNG's exact proportions.
const POSTER_WIDTH = 1000

export default function PosterCard({ album }: { album: RankedAlbum }) {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [spec, setSpec] = useState<PosterSpec | null>(null)
  const [specError, setSpecError] = useState<string | null>(null)

  const frameRef = useRef<HTMLDivElement>(null)
  const posterRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)
  const [frameHeight, setFrameHeight] = useState(0)

  useEffect(() => {
    let ignore = false
    getPosterSpec(album.album_id)
      .then((result) => {
        if (!ignore) setSpec(result)
      })
      .catch((err: Error) => {
        if (!ignore) setSpecError(err.message)
      })
    return () => {
      ignore = true
    }
  }, [album.album_id])

  // A transform does not affect layout, so the frame needs an explicit height or
  // it would reserve the poster's full unscaled height. Child layout effects run
  // first, so PosterTemplate has already shrunk its tracklist by the time we
  // measure — the height we read is final.
  useLayoutEffect(() => {
    if (!spec) return

    const measure = () => {
      const frame = frameRef.current
      const poster = posterRef.current
      if (!frame || !poster) return
      const nextScale = frame.clientWidth / POSTER_WIDTH
      setScale(nextScale)
      setFrameHeight(poster.offsetHeight * nextScale)
    }

    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [spec])

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
        // Fill the grid row so the download buttons line up across cards, whose
        // posters differ in height with track count.
        height: '100%',
      }}
    >
      <div style={{ position: 'relative', width: '100%' }}>
        {spec ? (
          <div
            ref={frameRef}
            style={{
              width: '100%',
              overflow: 'hidden',
              height: frameHeight || undefined,
              // Hidden until measured, otherwise the poster flashes at full size.
              visibility: scale ? 'visible' : 'hidden',
            }}
          >
            <div
              ref={posterRef}
              style={{
                width: POSTER_WIDTH,
                transformOrigin: 'top left',
                transform: scale ? `scale(${scale})` : undefined,
              }}
            >
              <PosterTemplate spec={spec} />
            </div>
          </div>
        ) : (
          // Cover art stands in until the spec lands, so the grid does not jump.
          <div
            style={{
              width: '100%',
              aspectRatio: '1 / 1',
              background: album.image_url ? `center / cover url(${album.image_url})` : '#333',
              borderRadius: '4px',
              opacity: specError ? 0.3 : 0.55,
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

      {specError && <div style={{ color: '#f87171', fontSize: '0.8em' }}>{specError}</div>}

      <div style={{ width: '100%' }}>
        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {album.name}
        </div>
        <div style={{ opacity: 0.75, fontSize: '0.9em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {album.artist_name}
        </div>
        <div style={{ opacity: 0.6, fontSize: '0.8em' }}>{album.track_count} songs</div>
      </div>

      <button
        onClick={handleDownload}
        disabled={downloading}
        className="btn-spotify"
        style={{ width: '100%', marginTop: 'auto' }}
      >
        {downloading ? 'Rendering…' : 'Download Poster'}
      </button>
      {error && <div style={{ color: '#f87171', fontSize: '0.8em' }}>{error}</div>}
    </div>
  )
}
