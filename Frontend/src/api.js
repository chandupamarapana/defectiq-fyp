const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function call(path, options = {}, token = null) {
    const headers = { ...(options.headers || {}) }
    if (token) headers['Authorization'] = `Bearer ${token}`
    if (options.body && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json'
    }
    const res  = await fetch(`${BASE}${path}`, { ...options, headers })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Request failed')
    return data
}

export const registerUser = (form) =>
    call('/register', { method: 'POST', body: JSON.stringify(form) })

export const loginUser = (form) =>
    call('/login', { method: 'POST', body: JSON.stringify(form) })

export const detectDefects = (formData, token) =>
    call('/detect', { method: 'POST', body: formData }, token)

export const fetchHistory = (token, params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return call(`/history${qs ? '?' + qs : ''}`, {}, token)
}

export const fetchStats = (token, params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return call(`/stats${qs ? '?' + qs : ''}`, {}, token)
}