import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe, logout } from '../lib/api'

interface User {
  display_name: string | null
  spotify_user_id: string
}

// Where a signed-in user lands: the two poster modes are independent features,
// so they pick one here rather than the app assuming Ranking.
export default function ModeSelectPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [navigate])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <h1 style={{ marginBottom: '0.2em' }}>Posterboy</h1>
      <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9em' }}>
        Signed in as {user?.display_name || user?.spotify_user_id}
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5em',
          maxWidth: 360,
          margin: '2.5em auto 0',
        }}
      >
        <div>
          <button
            style={{ width: '100%', padding: '1em 2em', fontSize: '1.1em' }}
            onClick={() => navigate('/dashboard')}
          >
            Ranking
          </button>
          <p style={{ margin: '0.5em 0 0', opacity: 0.65, fontSize: '0.85em' }}>
            Your most-played albums, ranked by listening prominence
          </p>
        </div>

        <div>
          <button
            style={{ width: '100%', padding: '1em 2em', fontSize: '1.1em' }}
            onClick={() => navigate('/colorsync')}
          >
            ColorSync
          </button>
          <p style={{ margin: '0.5em 0 0', opacity: 0.65, fontSize: '0.85em' }}>
            Albums whose cover art matches a seed album's colour palette
          </p>
        </div>
      </div>

      <p style={{ marginTop: '2.5em' }}>
        <button onClick={handleLogout}>Log out</button>
      </p>
    </div>
  )
}
