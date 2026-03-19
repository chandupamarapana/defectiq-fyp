// frontend/src/pages/RegisterPage.jsx
import { useState } from 'react'
import { registerUser } from '../api'
import '../styles/auth.css'

export default function RegisterPage({ onLogin, onGoLogin }) {
    const [form,    setForm]    = useState({
        username: '', password: '', full_name: '', profession: '', factory_name: ''
    })
    const [error,   setError]   = useState('')
    const [loading, setLoading] = useState(false)

    const submit = async (e) => {
        e.preventDefault()
        setLoading(true); setError('')
        try {
            const data = await registerUser(form)
            onLogin(data.token, data.user)
        } catch (err) { setError(err.message) }
        finally { setLoading(false) }
    }

    const field = (key, label, type='text', placeholder='') => (
        <div className="field">
            <label>{label}</label>
            <input type={type} required placeholder={placeholder}
                value={form[key]}
                onChange={e => setForm({...form, [key]: e.target.value})} />
        </div>
    )

    return (
        <div className="auth-page">
            <div className="auth-card auth-card-wide">
                <div className="auth-brand">
                    <h1>DefectIQ</h1>
                    <p>Create your account</p>
                </div>
                <form onSubmit={submit} className="auth-form">
                    <div className="field-grid">
                        {field('full_name',    'Full name',         'text',     'e.g. Chandupa Marapana')}
                        {field('username',     'Username',          'text',     'Choose a username')}
                        {field('password',     'Password',          'password', 'Min 6 characters')}
                        {field('profession',   'Profession / Role', 'text',     'e.g. Quality Inspector')}
                        {field('factory_name', 'Factory name',      'text',     'e.g. DCH Plywood')}
                    </div>
                    {error && <div className="auth-error">{error}</div>}
                    <button type="submit" className="btn-primary btn-full" disabled={loading}>
                        {loading ? 'Creating account…' : 'Create account'}
                    </button>
                </form>
                <p className="auth-switch">
                    Have an account?{' '}
                    <button onClick={onGoLogin} className="link-btn">Sign in</button>
                </p>
            </div>
        </div>
    )
}