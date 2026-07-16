import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe, logout } from '../lib/api'

interface User {
  id: string
  spotify_user_id: string
  display_name: string | null
  email: string | null
}

export default function CallbackPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Spotify may redirect back with an error (?error=server_error, access_denied, etc.)
    const params = new URLSearchParams(window.location.search)
    const spotifyError = params.get('error')
    if (spotifyError) {
      setError(`Spotify returned an error: "${spotifyError}". Please try logging in again.`)
      setLoading(false)
      return
    }

    const fetchUser = async () => {
      try {
        const userData = await getMe()
        setUser(userData)
        setLoading(false)
      } catch (err) {
        setError('Failed to load user. Please try logging in again.')
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/')}>Back to Login</button>
      </div>
    )
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>Welcome to Posterboy</h1>
      {user && (
        <>
          <p>Logged in as: {user.display_name || user.spotify_user_id}</p>
          <p>{user.email}</p>
        </>
      )}
      <p>This is a placeholder dashboard. More features coming soon!</p>
      <button onClick={handleLogout} style={{ padding: '0.6em 1.5em', marginTop: '1em' }}>
        Log out
      </button>
    </div>
  )
}
