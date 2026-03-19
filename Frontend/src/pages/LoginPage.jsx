// frontend/src/pages/LoginPage.jsx
import { useState } from 'react'
import { loginUser } from '../api'
import '../styles/auth.css'

export default function LoginPage({ onLogin, onGoRegister }) {
    const [form,    setForm]    = useState({ username: '', password: '' })
    const [error,   setError]   = useState('')
    const [loading, setLoading] = useState(false)

    const submit = async (e) => {
        e.preventDefault()
        setLoading(true); setError('')
        try {
            const data = await loginUser(form)
            onLogin(data.token, data.user)
        } catch (err) { setError(err.message) }
        finally { setLoading(false) }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-brand">
                    <h1>DefectIQ</h1>
                    <p>Plywood defect detection system</p>
                </div>
                <form onSubmit={submit} className="auth-form">
                    <div className="field">
                        <label>Username</label>
                        <input type="text" required placeholder="Enter username"
                            value={form.username}
                            onChange={e => setForm({...form, username: e.target.value})} />
                    </div>
                    <div className="field">
                        <label>Password</label>
                        <input type="password" required placeholder="Enter password"
                            value={form.password}
                            onChange={e => setForm({...form, password: e.target.value})} />
                    </div>
                    {error && <div className="auth-error">{error}</div>}
                    <button type="submit" className="btn-primary btn-full" disabled={loading}>
                        {loading ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>
                <p className="auth-switch">
                    No account?{' '}
                    <button onClick={onGoRegister} className="link-btn">Register</button>
                </p>
            </div>
        </div>
    )
}