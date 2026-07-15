import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe } from '../lib/api'

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
    </div>
  )
}
