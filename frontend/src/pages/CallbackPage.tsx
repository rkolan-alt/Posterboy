import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe } from '../lib/api'

// Lands here right after the Spotify OAuth redirect. Confirms the session
// took, then bounces to the real dashboard (which owns its own auth check).
export default function CallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Spotify may redirect back with an error (?error=server_error, access_denied, etc.)
    const params = new URLSearchParams(window.location.search)
    const spotifyError = params.get('error')
    if (spotifyError) {
      setError(`Spotify returned an error: "${spotifyError}". Please try logging in again.`)
      return
    }

    getMe()
      .then(() => navigate('/dashboard'))
      .catch(() => setError('Failed to load user. Please try logging in again.'))
  }, [navigate])

  if (error) {
    return (
      <div style={{ textAlign: 'center' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/')}>Back to Login</button>
      </div>
    )
  }

  return <div>Loading...</div>
}
