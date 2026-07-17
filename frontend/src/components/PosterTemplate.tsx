import { useLayoutEffect, useRef } from 'react'
import type { PosterSpec } from '../lib/api'
import './PosterTemplate.css'

// Kept in step with poster_render_service.py.
const TRACKLIST_MAX_FONT_PX = 17
const TRACKLIST_MIN_FONT_PX = 12

// The decorative Spotify-Code-style bars in the footer. Not scannable; the same
// fixed heights the Jinja template hardcodes.
const FOOTER_BAR_HEIGHTS = [
  14, 24, 10, 30, 18, 12, 26, 16, 22, 10, 28, 14, 20, 12, 24, 18, 10, 26, 16, 22,
]

/**
 * Live preview of a poster, mirroring backend/app/templates/poster.html.
 *
 * The downloadable PNG is always rendered server-side from that template; this
 * exists so the user can see the poster without waiting on a Playwright render
 * per card. The two are structurally identical and share a stylesheet layout —
 * a visual change has to be made in both.
 *
 * Renders at the template's natural 1000px width. Callers scale it down.
 */
export default function PosterTemplate({ spec }: { spec: PosterSpec }) {
  const tracklistRef = useRef<HTMLDivElement>(null)

  // Mirrors _SHRINK_TRACKLIST_TO_FIT_JS in poster_render_service.py: shrink the
  // tracklist until every name fits its column. Without this the preview would
  // ellipsize names that the real render shrinks to fit, so the PNG a user
  // downloads would not match what they previewed.
  useLayoutEffect(() => {
    const tracklist = tracklistRef.current
    if (!tracklist) return

    const names = Array.from(tracklist.querySelectorAll<HTMLElement>('.track-name'))
    if (names.length === 0) return

    const fits = () => names.every((el) => el.scrollWidth <= el.clientWidth + 1)

    let size = TRACKLIST_MAX_FONT_PX
    tracklist.style.fontSize = `${size}px`
    while (!fits() && size > TRACKLIST_MIN_FONT_PX) {
      size -= 0.5
      tracklist.style.fontSize = `${size}px`
    }
  }, [spec])

  return (
    <div className="poster">
      <div className="art-section">
        {spec.image_url && <img className="art-image" src={spec.image_url} alt="" />}
        <div className="spine-bar">
          {spec.spine_lines.map((line, i) => (
            <div key={i} className={line.type === 'letter' ? 'spine-letter' : 'spine-sep'}>
              {line.value}
            </div>
          ))}
        </div>
      </div>

      <div className="rule" />

      <div className="title-row">
        <div className="title">{spec.title}</div>
        <div className="swatch-strip">
          {spec.palette.map((color, i) => (
            <div key={i} className="swatch" style={{ background: color }} />
          ))}
        </div>
      </div>

      <div className="rule" />

      <div className="tracklist" ref={tracklistRef}>
        {[spec.col1, spec.col2].map((column, i) => (
          <div key={i} className="track-col">
            {column.map((track) => (
              <div key={track.track_number} className="track-row">
                <span className="track-num">{track.num_display}</span>
                <span className="track-name">{track.name}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="rule" />

      <div className="footer-row">
        <div className="footer-meta">
          {spec.artist} &bull; {spec.year}
        </div>
        <div className="footer-deco">
          {FOOTER_BAR_HEIGHTS.map((height, i) => (
            <div key={i} style={{ height }} />
          ))}
        </div>
      </div>
    </div>
  )
}
