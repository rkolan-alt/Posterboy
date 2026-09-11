import { useEffect, useRef, useState } from 'react'
import type { Playlist } from '../lib/api'

interface Props {
  playlists: Playlist[]
  /** null = all playlists (default); otherwise the explicit chosen IDs. */
  selected: string[] | null
  onChange: (next: string[] | null) => void
  disabled?: boolean
}

/** A compact pill that expands a checklist of the user's playlists. The draft
 *  selection is kept internal while open and only committed (via onChange) when
 *  the panel closes, so ticking several boxes triggers a single refetch. */
export default function PlaylistSelector({ playlists, selected, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Set<string>>(new Set())
  const wrapRef = useRef<HTMLDivElement>(null)

  const allIds = playlists.map((p) => p.id)

  const label =
    selected === null
      ? 'All playlists'
      : selected.length === 0
        ? 'No playlists'
        : `${selected.length} of ${playlists.length} playlists`

  // Collapse the current selection into a draft set (null → every ID checked).
  const openPanel = () => {
    setDraft(new Set(selected === null ? allIds : selected))
    setOpen(true)
  }

  // Normalise a draft back to the parent's shape: a full set is "all" (null).
  const commit = (next: Set<string>) => {
    onChange(next.size === allIds.length ? null : [...next])
  }

  const close = () => {
    setOpen(false)
    commit(draft)
  }

  const toggle = (id: string) => {
    setDraft((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Commit and close when clicking outside the open panel.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  })

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className="control-pill"
        disabled={disabled || playlists.length === 0}
        onClick={() => (open ? close() : openPanel())}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5em' }}
      >
        Playlists: {playlists.length === 0 ? 'none found' : label}
        <span style={{ fontSize: '0.7em', opacity: 0.7 }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 20,
            width: 300,
            maxHeight: 340,
            display: 'flex',
            flexDirection: 'column',
            background: '#181818',
            border: '1px solid #333',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '0.5em',
              padding: '0.6em 0.75em',
              borderBottom: '1px solid #333',
            }}
          >
            <button
              type="button"
              onClick={() => setDraft(new Set(allIds))}
              style={miniBtn}
            >
              Select all
            </button>
            <button type="button" onClick={() => setDraft(new Set())} style={miniBtn}>
              Clear
            </button>
          </div>

          <div style={{ overflowY: 'auto', padding: '0.25em 0' }}>
            {playlists.map((p) => (
              <label
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6em',
                  padding: '0.4em 0.75em',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={draft.has(p.id)}
                  onChange={() => toggle(p.id)}
                />
                <div
                  style={{
                    width: 32,
                    height: 32,
                    flex: 'none',
                    borderRadius: 4,
                    background: p.image_url ? `center / cover url(${p.image_url})` : '#333',
                  }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.9em',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.name}
                  </div>
                  {p.track_count != null && (
                    <div style={{ opacity: 0.6, fontSize: '0.75em' }}>{p.track_count} tracks</div>
                  )}
                </div>
              </label>
            ))}
          </div>

          <div style={{ padding: '0.6em 0.75em', borderTop: '1px solid #333' }}>
            <button type="button" onClick={close} style={{ ...miniBtn, width: '100%' }}>
              Done ({selectedCountForDraft(draft, allIds.length)})
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** "All" reads better than "N of N" on the Done button. */
function selectedCountForDraft(draft: Set<string>, total: number): string {
  return draft.size === total ? 'all' : `${draft.size}`
}

const miniBtn: React.CSSProperties = {
  padding: '0.3em 0.7em',
  fontSize: '0.8em',
  background: '#000',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  borderRadius: 6,
  boxShadow: 'none',
}
