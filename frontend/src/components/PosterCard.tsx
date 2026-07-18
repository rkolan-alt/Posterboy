import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PosterSpec } from '../lib/api'
import { downloadPoster, getPosterSpec } from '../lib/api'
import PosterTemplate from './PosterTemplate'

// PosterTemplate renders at the Jinja template's natural width; the card scales
// it down from there so the preview keeps the PNG's exact proportions.
const POSTER_WIDTH = 1000

// The fields a card needs to render, shared by every mode (Ranked, ColorSync).
export interface PosterCardAlbum {
  album_id: string
  name: string
  artist_name: string
  image_url: string | null
  rank: number
}

// `caption` is the third line under the title — each mode says something
// different there (Ranked: song count; ColorSync: colour-match distance).
export default function PosterCard({
  album,
  caption,
}: {
  album: PosterCardAlbum
  caption?: string
}) {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [spec, setSpec] = useState<PosterSpec | null>(null)
  const [specError, setSpecError] = useState<string | null>(null)

  const frameRef = useRef<HTMLDivElement>(null)
  const posterRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

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

  // Fit the poster inside the square footprint the cover art used, so cards stay
  // the size they were. The poster is portrait, so height is the binding
  // constraint and it ends up narrower than the card with a gap either side.
  // Child layout effects run first, so PosterTemplate has already shrunk its
  // tracklist by the time we measure — the height we read is final.
  useLayoutEffect(() => {
    if (!spec) return

    const measure = () => {
      const frame = frameRef.current
      const poster = posterRef.current
      if (!frame || !poster || !poster.offsetHeight) return
      setScale(
        Math.min(frame.clientWidth / POSTER_WIDTH, frame.clientHeight / poster.offsetHeight)
      )
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
        // Let the card shrink to its grid column so a long title clips (ellipsis)
        // instead of forcing the card — and its column — wider.
        minWidth: 0,
      }}
    >
      <div style={{ position: 'relative', width: '100%' }}>
        {spec ? (
          <div
            ref={frameRef}
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1 / 1',
              overflow: 'hidden',
              borderRadius: '4px',
            }}
          >
            <div
              ref={posterRef}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: POSTER_WIDTH,
                transformOrigin: 'center',
                transform: `translate(-50%, -50%) scale(${scale})`,
                // Hidden until measured, otherwise it flashes at full size.
                visibility: scale ? 'visible' : 'hidden',
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

      <div style={{ width: '100%', minWidth: 0 }}>
        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {album.name}
        </div>
        <div style={{ opacity: 0.75, fontSize: '0.9em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {album.artist_name}
        </div>
        {caption && <div style={{ opacity: 0.6, fontSize: '0.8em' }}>{caption}</div>}
      </div>

      <button onClick={handleDownload} disabled={downloading} style={{ width: '100%' }}>
        {downloading ? 'Rendering…' : 'Download Poster'}
      </button>
      {error && <div style={{ color: '#f87171', fontSize: '0.8em' }}>{error}</div>}
    </div>
  )
}
