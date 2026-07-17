import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe, API_BASE_URL } from '../lib/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if already logged in
    getMe()
      .then(() => {
        navigate('/modes')
      })
      .catch(() => {
        setLoading(false)
      })
  }, [navigate])

  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/api/auth/login`
  }

  if (loading) {
    return <div>Checking login status...</div>
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>Posterboy</h1>
      <p>Generate beautiful album posters from your Spotify listening history</p>
      <button onClick={handleLogin} style={{ padding: '1em 2em', fontSize: '1.1em' }}>
        Connect with Spotify
      </button>
    </div>
  )
}
