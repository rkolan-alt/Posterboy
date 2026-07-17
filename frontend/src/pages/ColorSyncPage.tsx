import { useNavigate } from 'react-router-dom'

// Placeholder. ColorSync is milestones 5-6 in docs/PLAN.md (k-means palette
// extraction, then CIEDE2000 similarity against a seed album). The mode chooser
// links here, so this says so plainly rather than leaving a dead button.
export default function ColorSyncPage() {
  const navigate = useNavigate()

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>ColorSync</h1>
      <p style={{ opacity: 0.75, maxWidth: 460, margin: '1em auto' }}>
        Not built yet. ColorSync will rank the albums in your library by how closely
        their cover art matches the colour palette of a seed album.
      </p>
      <button onClick={() => navigate('/modes')}>Back</button>
    </div>
  )
}
