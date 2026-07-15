const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export async function apiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_BASE_URL}/api${endpoint}`

  return fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })
}

export async function getMe() {
  const response = await apiCall('/auth/me')
  if (!response.ok) {
    throw new Error('Failed to fetch user')
  }
  return response.json()
}
