import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../lib/api'
import PosterPreview from '../components/PosterPreview'
import { demoAlbums } from '../demo/albums'

export default function LoginPage() {
  return <main className="landing">
    <header className="site-header"><Link className="wordmark" to="/">posterboy</Link><a className="quiet-link" href={`${API_BASE_URL}/api/auth/login`}>Connect Spotify ↗</a></header>
    <section className="hero">
      <div className="hero-copy"><p className="eyebrow">YOUR MUSIC. OFF THE RECORD.</p><h1>Good taste.<br />Great walls.</h1><p className="lede">Turn the albums you live with into posters you can live around. Made from your music, down to the last colour.</p><div className="hero-actions"><Link className="button primary" to="/demo">Try the demo ↗</Link><a className="button secondary" href={`${API_BASE_URL}/api/auth/login`}>Connect Spotify</a></div><p className="fine-print">Try the demo without an account. Spotify connection is currently limited to approved users.</p></div>
      <div className="hero-gallery" aria-label="Sample album posters"><div className="hero-poster back"><PosterPreview spec={demoAlbums[1]} /></div><div className="hero-poster front"><PosterPreview spec={demoAlbums[0]} /></div></div>
    </section>
    <section className="intro-strip"><p>FROM YOUR HEADPHONES<br /><strong>TO YOUR WALL.</strong></p><div><span>01 / FIND YOUR RECORDS</span><p>Explore your most-loved albums, or pick a collection.</p></div><div><span>02 / FOLLOW THE COLOUR</span><p>Find artwork that belongs together with ColorSync.</p></div><div><span>03 / MAKE IT YOURS</span><p>Preview your poster. Download a crisp PNG. Find its place.</p></div></section>
    <footer className="site-footer"><span>posterboy / A home for your listening habits.</span><span>Built for music people.</span></footer>
  </main>
}
