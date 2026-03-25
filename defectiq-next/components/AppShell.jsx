'use client'
import { useState, useEffect, useCallback } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

const DEFECT_LABELS = {
  bubbling:           'Bubbling',
  delamination:       'Delamination',
  imprint_on_surface: 'Imprint on Surface',
  missing_face:       'Missing Face',
  warping:            'Warping',
}

const DEFECT_ICONS = {
  bubbling:           '🫧',
  delamination:       '📋',
  imprint_on_surface: '🖨',
  missing_face:       '⬜',
  warping:            '🌊',
}

function useApi(token) {
  return useCallback(async (path, options = {}) => {
    const headers = { ...(options.headers || {}) }
    if (token) headers['Authorization'] = `Bearer ${token}`
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }
    const res  = await fetch(`${API}${path}`, { ...options, headers })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Request failed')
    return data
  }, [token])
}

function SectionTitle({ children }) {
  return (
    <h3 className="section-title">
      <span className="section-title-bar" />
      {children}
    </h3>
  )
}

// ── Verdict Banner ─────────────────────────────────
function VerdictBanner({ verdict }) {
  const map = {
    PASS:   { cls: 'verdict-pass',   icon: '✓', label: 'PASS',   sub: 'Board is acceptable for use' },
    FAIL:   { cls: 'verdict-fail',   icon: '✕', label: 'FAIL',   sub: 'Significant defects detected' },
    REVIEW: { cls: 'verdict-review', icon: '!', label: 'REVIEW', sub: 'Manual inspection advised' },
  }
  const v = map[verdict] || map.REVIEW
  return (
    <div className={`verdict-banner ${v.cls}`}>
      <div className="verdict-icon-wrap">{v.icon}</div>
      <div className="verdict-text-block">
        <span className="verdict-label">{v.label}</span>
        <span className="verdict-sub">{v.sub}</span>
      </div>
    </div>
  )
}

// ── Confidence Bar ─────────────────────────────────
function ConfBar({ label, value, detected }) {
  const pct = Math.round(value * 100)
  return (
    <div className={`conf-row ${detected ? 'detected' : ''}`}>
      <span className="conf-label">{DEFECT_LABELS[label] || label}</span>
      <div className="conf-track">
        <div className="conf-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="conf-pct">{pct}%</span>
      {detected && <span className="conf-tag">DETECTED</span>}
    </div>
  )
}

// ── Upload Zone ────────────────────────────────────
function UploadZone({ label, preview, onChange, disabled }) {
  const [drag, setDrag] = useState(false)
  const onDrop = useCallback((e) => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f) onChange({ target: { files: [f] } })
  }, [onChange])

  return (
    <div
      className={`upload-zone ${preview ? 'has-preview' : ''} ${drag ? 'dragging' : ''}`}
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
    >
      {preview
        ? <img src={preview} alt={label} className="preview-img" />
        : <div className="upload-placeholder">
            <div className="upload-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
            </div>
            <p>Drop image or click to browse</p>
            <span>Supports JPG, PNG, WEBP</span>
          </div>
      }
      <input
        type="file" accept="image/*" onChange={onChange}
        disabled={disabled} className="file-input"
      />
      <div className="upload-label-tag">{label}</div>
    </div>
  )
}

// ── Login Page ─────────────────────────────────────
function LoginPage({ onLogin, onGoRegister }) {
  const [form, setForm]     = useState({ username: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res  = await fetch(`${API}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (res.ok) onLogin(data.token, data.user)
      else setError(data.error || 'Login failed')
    } catch { setError('Cannot reach server. Make sure Flask backend is running.') }
    finally   { setLoading(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark-lg">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              <path d="M11 8v3l2 2" strokeWidth="1.5"/>
            </svg>
          </div>
          <h1>DefectIQ</h1>
          <p>Plywood defect detection system</p>
        </div>
        <form onSubmit={submit} className="auth-form">
          <div className="field">
            <label>Username</label>
            <input type="text" placeholder="Enter your username" required
              value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" placeholder="Enter your password" required
              value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
          </div>
          {error && <div className="auth-error">⚠ {error}</div>}
          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? <><span className="spinner" /> Signing in…</> : 'Sign in'}
          </button>
        </form>
        <p className="auth-switch">
          Don&apos;t have an account?{' '}
          <button onClick={onGoRegister} className="link-btn">Register here</button>
        </p>
      </div>
    </div>
  )
}

// ── Register Page ──────────────────────────────────
function RegisterPage({ onLogin, onGoLogin }) {
  const [form, setForm] = useState({ username: '', password: '', full_name: '', profession: '', factory_name: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res  = await fetch(`${API}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (res.ok) onLogin(data.token, data.user)
      else setError(data.error || 'Registration failed')
    } catch { setError('Cannot reach server.') }
    finally   { setLoading(false) }
  }

  const field = (key, label, type='text', placeholder='') => (
    <div className="field">
      <label>{label}</label>
      <input type={type} placeholder={placeholder} required
        value={form[key]} onChange={e => setForm({...form, [key]: e.target.value})} />
    </div>
  )

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-brand">
          <div className="brand-mark-lg">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              <path d="M11 8v3l2 2" strokeWidth="1.5"/>
            </svg>
          </div>
          <h1>DefectIQ</h1>
          <p>Create your account</p>
        </div>
        <form onSubmit={submit} className="auth-form">
          <div className="field-grid">
            {field('full_name',    'Full name',         'text',     'e.g. Chandupa Marapana')}
            {field('username',     'Username',          'text',     'Choose a username')}
            {field('password',     'Password',          'password', 'Min 6 characters')}
            {field('profession',   'Profession / Role', 'text',     'e.g. Quality Inspector')}
            {field('factory_name', 'Factory / Company', 'text',     'e.g. DCH Plywood')}
          </div>
          {error && <div className="auth-error">⚠ {error}</div>}
          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? <><span className="spinner" /> Creating account…</> : 'Create account'}
          </button>
        </form>
        <p className="auth-switch">
          Already have an account?{' '}
          <button onClick={onGoLogin} className="link-btn">Sign in</button>
        </p>
      </div>
    </div>
  )
}

// ── Annotated Image with click-to-expand ───────────
function AnnImage({ base64, label, defects }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      className={`ann-wrap ${expanded ? 'ann-expanded' : ''}`}
      onClick={() => setExpanded(e => !e)}
    >
      <span className="ann-label">{label} {expanded ? '🔍' : '↗'}</span>
      <img
        src={`data:image/jpeg;base64,${base64}`}
        alt={`${label} annotated`}
      />
      {defects && defects.length > 0 && (
        <div className="ann-defects">
          {defects.map(d => (
            <span key={d} className="ann-defect-chip">
              {DEFECT_ICONS[d] || '⚠'} {DEFECT_LABELS[d] || d}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Inspect Page ───────────────────────────────────
function InspectPage({ token }) {
  const api = useApi(token)
  const [topImg,   setTopImg]   = useState(null)
  const [sideImg,  setSideImg]  = useState(null)
  const [topPrev,  setTopPrev]  = useState(null)
  const [sidePrev, setSidePrev] = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [results,  setResults]  = useState(null)
  const [error,    setError]    = useState('')

  const handleTop  = e => { const f = e.target.files[0]; if (f) { setTopImg(f);  setTopPrev(URL.createObjectURL(f))  } }
  const handleSide = e => { const f = e.target.files[0]; if (f) { setSideImg(f); setSidePrev(URL.createObjectURL(f)) } }

  const reset = () => {
    setTopImg(null); setSideImg(null); setTopPrev(null)
    setSidePrev(null); setResults(null); setError('')
  }

  const submit = async () => {
    if (!topImg && !sideImg) { setError('Upload at least one image.'); return }
    setLoading(true); setError(''); setResults(null)
    const fd = new FormData()
    if (topImg)  fd.append('top_view',  topImg)
    if (sideImg) fd.append('side_view', sideImg)
    try {
      const data = await api('/detect', { method: 'POST', body: fd })
      setResults(data)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  // ── Results ──
  if (results) {
    const detected = new Set(results.defects || [])
    const conf     = results.confidences || {}
    const defectList = results.defects || []

    return (
      <div className="inspect-results">

        {/* Verdict + Confidence */}
        <div className="section-card">
          <VerdictBanner verdict={results.verdict} />
          <div className="conf-list" style={{ marginTop: '1.25rem' }}>
            {Object.entries(conf)
              .sort((a, b) => b[1] - a[1])
              .map(([cls, val]) => (
                <ConfBar key={cls} label={cls} value={val} detected={detected.has(cls)} />
              ))}
          </div>
        </div>

        {/* Annotated images — large with defect overlays */}
        {(results.annotated_images?.top_view || results.annotated_images?.side_view) && (
          <div className="section-card">
            <SectionTitle>Board images — click to expand</SectionTitle>
            <div className="annotated-grid">
              {results.annotated_images?.top_view && (
                <AnnImage
                  base64={results.annotated_images.top_view}
                  label="Top view"
                  defects={defectList}
                />
              )}
              {results.annotated_images?.side_view && (
                <AnnImage
                  base64={results.annotated_images.side_view}
                  label="Side view"
                  defects={defectList}
                />
              )}
            </div>
          </div>
        )}

        {/* Defect reasons */}
        {defectList.length > 0 && (
          <div className="section-card">
            <SectionTitle>Defect analysis &amp; recommendations</SectionTitle>
            {defectList.map(d => {
              const info = results.defect_info?.[d]
              const pct  = Math.round((conf[d] || 0) * 100)
              if (!info) return null
              return (
                <div key={d} className="defect-reason-card">
                  <div className="dr-header">
                    <div className="dr-name-wrap">
                      <div className="dr-icon">{DEFECT_ICONS[d] || '⚠'}</div>
                      <span className="dr-name">{DEFECT_LABELS[d] || d}</span>
                    </div>
                    <span className="dr-conf-badge">{pct}% confidence</span>
                  </div>
                  <p className="dr-summary">{info.summary}</p>
                  <div className="dr-recs">
                    <span className="dr-recs-title">Recommendations</span>
                    <ul>
                      {info.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {defectList.length === 0 && (
          <div className="section-card">
            <div className="pass-state">
              <div className="pass-icon">✓</div>
              <p>No defects detected above threshold</p>
              <span>Board passes quality inspection at threshold 0.48</span>
            </div>
          </div>
        )}

        <button className="btn-ghost" onClick={reset} style={{ marginTop: '0.5rem' }}>
          ← New inspection
        </button>
      </div>
    )
  }

  // ── Upload ──
  return (
    <div className="inspect-upload">
      <div className="page-header">
        <h2>Board Inspection</h2>
        <p>Upload top-view and/or side-view images for dual-view defect analysis</p>
      </div>
      <div className="upload-grid">
        <UploadZone label="Top view"  preview={topPrev}  onChange={handleTop}  disabled={loading} />
        <UploadZone label="Side view" preview={sidePrev} onChange={handleSide} disabled={loading} />
      </div>
      {error && <div className="error-bar">⚠ {error}</div>}
      <div className="action-row">
        <button className="btn-primary" onClick={submit} disabled={loading || (!topImg && !sideImg)}>
          {loading
            ? <><span className="spinner" /> Analysing board…</>
            : <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                Analyse board
              </>
          }
        </button>
        <button className="btn-ghost" onClick={reset} disabled={loading}>Clear</button>
      </div>
    </div>
  )
}

// ── Dashboard Page ─────────────────────────────────
function DashboardPage({ token }) {
  const api = useApi(token)
  const [stats,        setStats]        = useState(null)
  const [history,      setHistory]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showFilter,   setShowFilter]   = useState(false)
  const [dateFrom,     setDateFrom]     = useState('')
  const [dateTo,       setDateTo]       = useState('')
  const [limit,        setLimit]        = useState(10)
  const [totalCount,   setTotalCount]   = useState(0)
  const [filterActive, setFilterActive] = useState(false)

  const load = useCallback(async (from='', to='', lim=10) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to)   params.set('to', to)
    params.set('limit', lim)
    const qs = `?${params}`
    try {
      const [s, h] = await Promise.all([api(`/stats${qs}`), api(`/history${qs}`)])
      setStats(s)
      setHistory(h.history || [])
      setTotalCount(s.total || 0)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [api])

  useEffect(() => { load('', '', 10) }, [load])

  const applyFilter = () => {
    setLimit(50); setFilterActive(true); setShowFilter(false); load(dateFrom, dateTo, 50)
  }
  const clearFilter = () => {
    setDateFrom(''); setDateTo(''); setFilterActive(false); setShowFilter(false); setLimit(10); load('', '', 10)
  }
  const loadMore = () => { const n = limit + 10; setLimit(n); load(dateFrom, dateTo, n) }

  if (loading) return (
    <div className="dash-loading">
      <span className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }} />
      <span>Loading dashboard…</span>
    </div>
  )

  const topDefects = Object.entries(stats?.defect_frequency || {}).sort((a,b) => b[1]-a[1]).slice(0,6)
  const maxFreq    = topDefects[0]?.[1] || 1
  const hasMore    = history.length >= limit && history.length < totalCount

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Inspection history and defect analytics</p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total inspections</span>
          <span className="kpi-value">{stats?.total || 0}</span>
        </div>
        <div className="kpi-card kpi-pass">
          <span className="kpi-label">Pass rate</span>
          <span className="kpi-value">{stats?.pass_rate || 0}%</span>
        </div>
        <div className="kpi-card kpi-review">
          <span className="kpi-label">Review required</span>
          <span className="kpi-value">{stats?.review || 0}</span>
        </div>
      </div>

      <div className="dash-grid">
        <div className="section-card">
          <SectionTitle>Defect frequency</SectionTitle>
          {topDefects.length === 0
            ? <p className="empty-state">No defects recorded yet.</p>
            : <div className="freq-list">
                {topDefects.map(([cls, cnt]) => (
                  <div key={cls} className="freq-row">
                    <span className="freq-label">{DEFECT_LABELS[cls] || cls}</span>
                    <div className="freq-track">
                      <div className="freq-fill" style={{ width: `${(cnt/maxFreq)*100}%` }} />
                    </div>
                    <span className="freq-count">{cnt}</span>
                  </div>
                ))}
              </div>
          }
        </div>

        <div className="section-card">
          <SectionTitle>Verdict breakdown</SectionTitle>
          <div className="verdict-breakdown">
            {[{key:'passed',label:'Pass',cls:'vb-pass'},{key:'review',label:'Review',cls:'vb-review'}].map(({key,label,cls}) => {
              const val = stats?.[key] || 0
              const pct = stats?.total > 0 ? Math.round(val/stats.total*100) : 0
              return (
                <div key={key} className="vb-row">
                  <span className={`vb-dot ${cls}`} />
                  <span className="vb-label">{label}</span>
                  <div className="vb-track">
                    <div className={`vb-fill ${cls}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="vb-pct">{pct}%</span>
                  <span className="vb-count">({val})</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="section-card">
        <div className="hist-header">
          <SectionTitle>
            Inspection history
            {filterActive && <span className="filter-badge"> · {dateFrom} → {dateTo}</span>}
          </SectionTitle>
          <button className={`btn-ghost btn-sm ${showFilter ? 'active' : ''}`}
            onClick={() => setShowFilter(!showFilter)}>
            {showFilter ? 'Hide' : '📅 Date filter'}
          </button>
        </div>

        {showFilter && (
          <div className="date-filter">
            <span style={{fontSize:'13px',color:'var(--text2)'}}>From</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <span style={{fontSize:'13px',color:'var(--text2)'}}>To</span>
            <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)} />
            <button className="btn-primary btn-sm" onClick={applyFilter}>Apply</button>
            {filterActive && <button className="btn-ghost btn-sm" onClick={clearFilter}>Clear</button>}
          </div>
        )}

        {history.length === 0
          ? <p className="empty-state" style={{marginTop:'1rem'}}>No inspections found.</p>
          : <>
              <div className="table-wrap" style={{marginTop:'1rem'}}>
                <table className="hist-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Date &amp; Time</th>
                      <th>Verdict</th><th>Defects detected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(row => (
                      <tr key={row.id}>
                        <td className="td-id">{row.id}</td>
                        <td className="td-ts">{row.timestamp}</td>
                        <td>
                          <span className={`verdict-chip vc-${row.verdict.toLowerCase()}`}>
                            {row.verdict}
                          </span>
                        </td>
                        <td className="td-defects">
                          {row.defects.length === 0
                            ? <span className="no-defects">None</span>
                            : row.defects.map(d => (
                                <span key={d} className="defect-chip-sm">
                                  {DEFECT_LABELS[d] || d}
                                </span>
                              ))
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="hist-footer">
                <span className="hist-count">
                  Showing {history.length} of {totalCount} inspections
                </span>
                <div style={{display:'flex',gap:'8px'}}>
                  {hasMore && <button className="btn-ghost btn-sm" onClick={loadMore}>See more</button>}
                  {filterActive && <button className="btn-ghost btn-sm" onClick={clearFilter}>Show all</button>}
                </div>
              </div>
            </>
        }
      </div>
    </div>
  )
}

// ── App Shell ──────────────────────────────────────
export default function AppShell() {
  const [token,    setToken]    = useState(null)
  const [user,     setUser]     = useState(null)
  const [authPage, setAuthPage] = useState('login')
  const [tab,      setTab]      = useState('inspect')
  const [mounted,  setMounted]  = useState(false)

  useEffect(() => {
    setMounted(true)
    const t = sessionStorage.getItem('token')
    const u = sessionStorage.getItem('user')
    if (t) { setToken(t); setUser(u ? JSON.parse(u) : null) }
  }, [])

  const onLogin = (t, u) => {
    setToken(t); setUser(u)
    sessionStorage.setItem('token', t)
    sessionStorage.setItem('user',  JSON.stringify(u))
    setTab('inspect')
  }

  const onLogout = () => {
    setToken(null); setUser(null)
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
  }

  if (!mounted) return null

  if (!token) {
    return authPage === 'login'
      ? <LoginPage    onLogin={onLogin} onGoRegister={() => setAuthPage('register')} />
      : <RegisterPage onLogin={onLogin} onGoLogin={()    => setAuthPage('login')} />
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
    : 'U'

  return (
    <div className="shell">
      <header className="shell-header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-mark">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                <path d="M11 8v3l2 2" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <span className="brand-name">DefectIQ</span>
              <span className="brand-sub">Plywood inspection system</span>
            </div>
          </div>

          <nav className="tab-nav">
            <button className={`tab-btn ${tab==='inspect' ? 'active' : ''}`} onClick={() => setTab('inspect')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              Inspect
            </button>
            <button className={`tab-btn ${tab==='dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              Dashboard
            </button>
          </nav>

          <div className="header-right">
            <div className="user-pill">
              <div className="user-avatar">{initials}</div>
              <div>
                <span className="user-name">{user?.full_name}</span>
                <span className="user-factory">{user?.factory_name}</span>
              </div>
            </div>
            <button className="btn-logout" onClick={onLogout}>Sign out</button>
          </div>
        </div>
      </header>

      <main className="shell-main">
        <div className="page-inner">
          {tab === 'inspect'   && <InspectPage   token={token} />}
          {tab === 'dashboard' && <DashboardPage token={token} />}
        </div>
      </main>

      <footer className="shell-footer">
        <span>DefectIQ — Post-manufactured plywood defect detection</span>
        <span>Chandupa Marapana · IIT × University of Westminster · 2026</span>
      </footer>
    </div>
  )
}
