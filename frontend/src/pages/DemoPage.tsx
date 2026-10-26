import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PosterPreview from '../components/PosterPreview'
import { demoAlbums } from '../demo/albums'
import type { PosterSpec } from '../lib/api'
import { API_BASE_URL } from '../lib/api'

export default function DemoPage() {
  const [mode, setMode] = useState('albums')
  const [seed, setSeed] = useState(0)
  const [limit, setLimit] = useState(6)
  const [selected, setSelected] = useState<PosterSpec | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { if (selected) dialog.current?.showModal() }, [selected])
  const ranked = mode === 'albums' ? demoAlbums : demoAlbums.filter(a => a !== demoAlbums[seed]).sort((a, b) => distance(a, demoAlbums[seed]) - distance(b, demoAlbums[seed]))
  return <main>
    <header className="site-header"><Link className="wordmark" to="/">posterboy</Link><a className="button secondary" href={`${API_BASE_URL}/api/auth/login`}>Connect Spotify ↗</a></header>
    <div className="demo-banner"><strong>THE SAMPLE COLLECTION</strong><span>Real records. A sample collection. No Spotify account needed.</span></div>
    <section className="workspace-heading"><p className="eyebrow">A RECORD OF YOUR TASTE</p><h1>Your next wall starts here.</h1><p>Explore a sample collection, then follow the colours somewhere new.</p></section>
    <div className="workspace-toolbar"><div className="tabs" aria-label="Collection mode"><button aria-pressed={mode === 'albums'} onClick={() => setMode('albums')}>Your albums</button><button aria-pressed={mode === 'colour'} onClick={() => setMode('colour')}>ColorSync</button></div><label>Show <select value={limit} onChange={e => setLimit(Number(e.target.value))}>{[1,2,3,4,5,6].map(n => <option key={n}>{n}</option>)}</select> posters</label></div>
    {mode === 'colour' && <section className="seed-picker"><div><h2>Start with a colour story.</h2><p>Choose a seed album to reorder the collection by its artwork colours.</p><p className="fine-print">Demo uses a simple RGB palette comparison. Your Spotify collection uses perceptual ColorSync matching.</p></div><label>Match to <select value={seed} onChange={e => setSeed(Number(e.target.value))}>{demoAlbums.map((a,i) => <option value={i} key={a.album_id}>{a.title}</option>)}</select></label><div className="palette">{demoAlbums[seed].palette.map(c => <span key={c} style={{background:c}} />)}</div></section>}
    <div className="demo-grid">{ranked.slice(0,limit).map((a,i) => <article className="sample-card" key={a.album_id}><button className="poster-open" aria-label={`Preview ${a.title}`} onClick={() => setSelected(a)}><PosterPreview spec={a} /></button><div className="sample-caption"><div><span className="eyebrow">{String(i+1).padStart(2,'0')} / {mode === 'colour' ? 'COLOUR MATCH' : 'SAMPLE RECORD'}</span><h2>{a.title}</h2><p>{a.artist}</p><a className="fine-print" href={a.source} target="_blank" rel="noreferrer">View on Apple Music ↗</a></div><button className="text-button" onClick={() => setSelected(a)}>View poster ↗</button></div></article>)}</div>
    <footer className="site-footer"><span>Like what you see? Bring your own records.</span><a href={`${API_BASE_URL}/api/auth/login`}>Connect Spotify ↗</a></footer>
    <dialog ref={dialog} className="poster-dialog" onClose={() => setSelected(null)} onClick={e => {if (e.target === e.currentTarget) dialog.current?.close()}}>{selected && <><div className="dialog-toolbar"><strong>{selected.title}</strong><button autoFocus onClick={() => dialog.current?.close()} aria-label="Close preview">Close ×</button></div><PosterPreview spec={selected} /><p className="fine-print">Sample poster · Cover artwork belongs to its respective rights holders.</p><a className="button primary" href={`/demo/${selected.album_id}.png`} download={`${selected.artist} - ${selected.title}.png`}>Download sample PNG ↓</a></>}</dialog>
  </main>
}
function distance(a: PosterSpec, b: PosterSpec) {
  const rgb = (hex: string) => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16))
  return a.palette.reduce((sum,c) => sum + Math.min(...b.palette.map(d => rgb(c).reduce((s,v,i) => s + (v-rgb(d)[i])**2,0))),0)
}
