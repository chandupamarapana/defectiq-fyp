import { useState, useEffect, useCallback } from 'react';
import './App.css';

const API = 'http://localhost:5000';

const DEFECT_LABELS = {
  bubbling:           'Bubbling',
  delamination:       'Delamination',
  imprint_on_surface: 'Imprint on Surface',
  missing_edges:      'Missing Edges',
  missing_top_face:   'Missing Top Face',
  warping:            'Warping',
};

// ── API helper — attaches token automatically ──
function useApi(token) {
  const call = useCallback(async (path, options = {}) => {
    const headers = { ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    const res  = await fetch(`${API}${path}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }, [token]);
  return call;
}

// ── Verdict Banner ────────────────────────────
function VerdictBanner({ verdict }) {
  const map = {
    PASS:   { cls: 'verdict-pass',   icon: '✓', text: 'PASS — Board is acceptable' },
    FAIL:   { cls: 'verdict-fail',   icon: '✕', text: 'FAIL — Defects detected' },
    REVIEW: { cls: 'verdict-review', icon: '!', text: 'REVIEW — Manual inspection advised' },
  };
  const v = map[verdict] || map.REVIEW;
  return (
    <div className={`verdict-banner ${v.cls}`}>
      <span className="verdict-icon">{v.icon}</span>
      <span className="verdict-text">{v.text}</span>
    </div>
  );
}

// ── Confidence Bar ────────────────────────────
function ConfBar({ label, value, detected }) {
  const pct = Math.round(value * 100);
  return (
    <div className={`conf-row ${detected ? 'detected' : ''}`}>
      <span className="conf-label">{DEFECT_LABELS[label] || label}</span>
      <div className="conf-track">
        <div className="conf-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="conf-pct">{pct}%</span>
      {detected && <span className="conf-tag">DETECTED</span>}
    </div>
  );
}

// ── Upload Zone ───────────────────────────────
function UploadZone({ label, preview, onChange, disabled }) {
  const [drag, setDrag] = useState(false);
  const onDrop = useCallback((e) => {
    e.preventDefault(); setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) onChange({ target: { files: [file] } });
  }, [onChange]);
  return (
    <div
      className={`upload-zone ${preview ? 'has-preview' : ''} ${drag ? 'dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
    >
      {preview
        ? <img src={preview} alt={label} className="preview-img" />
        : <div className="upload-placeholder">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            <p>Drop image or click to browse</p>
          </div>
      }
      <input type="file" accept="image/*" onChange={onChange} disabled={disabled} className="file-input" />
      <div className="upload-label-tag">{label}</div>
    </div>
  );
}

// ── Login Page ────────────────────────────────
function LoginPage({ onLogin, onGoRegister }) {
  const [form, setForm]   = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) onLogin(data.token, data.user);
      else setError(data.error || 'Login failed');
    } catch { setError('Cannot reach server. Make sure Flask is running.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark-lg">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <h1>DefectIQ</h1>
          <p>Plywood defect detection system</p>
        </div>

        <form onSubmit={submit} className="auth-form">
          <div className="field">
            <label>Username</label>
            <input
              type="text" placeholder="Enter your username" required
              value={form.username}
              onChange={e => setForm({...form, username: e.target.value})}
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password" placeholder="Enter your password" required
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
            />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{' '}
          <button onClick={onGoRegister} className="link-btn">Register here</button>
        </p>
      </div>
    </div>
  );
}

// ── Register Page ─────────────────────────────
function RegisterPage({ onLogin, onGoLogin }) {
  const [form, setForm]   = useState({
    username: '', password: '', full_name: '',
    profession: '', factory_name: ''
  });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) onLogin(data.token, data.user);
      else setError(data.error || 'Registration failed');
    } catch { setError('Cannot reach server.'); }
    finally { setLoading(false); }
  };

  const field = (key, label, type='text', placeholder='') => (
    <div className="field">
      <label>{label}</label>
      <input
        type={type} placeholder={placeholder} required
        value={form[key]}
        onChange={e => setForm({...form, [key]: e.target.value})}
      />
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-brand">
          <div className="brand-mark-lg">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <h1>DefectIQ</h1>
          <p>Create your account</p>
        </div>

        <form onSubmit={submit} className="auth-form">
          <div className="field-grid">
            {field('full_name',    'Full name',            'text',     'e.g. Chandupa Marapana')}
            {field('username',     'Username',             'text',     'Choose a username')}
            {field('password',     'Password',             'password', 'Min 6 characters')}
            {field('profession',   'Profession / Role',    'text',     'e.g. Quality Inspector')}
            {field('factory_name', 'Factory / Company',    'text',     'e.g. DCH Plywood Manufacturers')}
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <button onClick={onGoLogin} className="link-btn">Sign in</button>
        </p>
      </div>
    </div>
  );
}

// ── Inspect Page ──────────────────────────────
function InspectPage({ token }) {
  const api = useApi(token);
  const [topImg,   setTopImg]   = useState(null);
  const [sideImg,  setSideImg]  = useState(null);
  const [topPrev,  setTopPrev]  = useState(null);
  const [sidePrev, setSidePrev] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [results,  setResults]  = useState(null);
  const [error,    setError]    = useState('');

  const handleTop  = e => { const f = e.target.files[0]; if (f) { setTopImg(f);  setTopPrev(URL.createObjectURL(f));  } };
  const handleSide = e => { const f = e.target.files[0]; if (f) { setSideImg(f); setSidePrev(URL.createObjectURL(f)); } };

  const reset = () => {
    setTopImg(null); setSideImg(null); setTopPrev(null);
    setSidePrev(null); setResults(null); setError('');
  };

  const submit = async () => {
    if (!topImg && !sideImg) { setError('Upload at least one image.'); return; }
    setLoading(true); setError(''); setResults(null);
    const fd = new FormData();
    if (topImg)  fd.append('top_view',  topImg);
    if (sideImg) fd.append('side_view', sideImg);
    try {
      const data = await api('/detect', { method: 'POST', body: fd });
      setResults(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // ── Results view ──
  if (results) {
    const detected = new Set(results.defects || []);
    const conf     = results.confidences || {};

    return (
      <div className="inspect-results">

        {/* 1. Model output — verdict + confidence scores */}
        <div className="section-card">
          <VerdictBanner verdict={results.verdict} />
          <div className="conf-list" style={{marginTop: '1rem'}}>
            {Object.entries(conf)
              .sort((a, b) => b[1] - a[1])
              .map(([cls, val]) => (
                <ConfBar key={cls} label={cls} value={val} detected={detected.has(cls)} />
              ))}
          </div>
        </div>

        {/* 2. Annotated images */}
        {(results.annotated_images?.top_view || results.annotated_images?.side_view) && (
          <div className="section-card">
            <h3 className="section-title">Board images — detected defects highlighted</h3>
            <div className="annotated-grid">
              {results.annotated_images?.top_view && (
                <div className="ann-wrap">
                  <span className="ann-label">Top view</span>
                  <img src={`data:image/jpeg;base64,${results.annotated_images.top_view}`} alt="top annotated" />
                </div>
              )}
              {results.annotated_images?.side_view && (
                <div className="ann-wrap">
                  <span className="ann-label">Side view</span>
                  <img src={`data:image/jpeg;base64,${results.annotated_images.side_view}`} alt="side annotated" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Defect reasons */}
        {results.defects?.length > 0 && (
          <div className="section-card">
            <h3 className="section-title">Defect analysis and recommendations</h3>
            {results.defects.map(d => {
              const info = results.defect_info?.[d];
              const pct  = Math.round((conf[d] || 0) * 100);
              if (!info) return null;
              return (
                <div key={d} className="defect-reason-card">
                  <div className="dr-header">
                    <span className="dr-name">{DEFECT_LABELS[d] || d}</span>
                    <span className="dr-pct">{pct}% confidence</span>
                  </div>
                  <p className="dr-summary">{info.summary}</p>
                  <div className="dr-recs">
                    <strong>Recommendations:</strong>
                    <ul>
                      {info.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {results.defects?.length === 0 && (
          <div className="section-card">
            <p style={{color: 'var(--pass)', textAlign: 'center', padding: '1rem', fontSize: '15px'}}>
              ✓ No defects detected. Board passes quality inspection.
            </p>
          </div>
        )}

        <button className="btn-ghost" onClick={reset} style={{marginTop: '1rem'}}>
          ← New inspection
        </button>
      </div>
    );
  }

  // ── Upload view ──
  return (
    <div className="inspect-upload">
      <p className="page-sub">Upload top-view and/or side-view images for dual-view defect analysis</p>
      <div className="upload-grid">
        <UploadZone label="Top view"  preview={topPrev}  onChange={handleTop}  disabled={loading} />
        <UploadZone label="Side view" preview={sidePrev} onChange={handleSide} disabled={loading} />
      </div>
      {error && <div className="error-bar">{error}</div>}
      <div className="action-row">
        <button className="btn-primary" onClick={submit} disabled={loading || (!topImg && !sideImg)}>
          {loading ? <><span className="spinner" /> Analysing…</> : 'Analyse board'}
        </button>
        <button className="btn-ghost" onClick={reset} disabled={loading}>Clear</button>
      </div>
    </div>
  );
}

// ── Dashboard Page ────────────────────────────
function DashboardPage({ token }) {
  const api = useApi(token);
  const [stats,        setStats]        = useState(null);
  const [history,      setHistory]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showFilter,   setShowFilter]   = useState(false);
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [limit,        setLimit]        = useState(10);
  const [totalCount,   setTotalCount]   = useState(0);
  const [filterActive, setFilterActive] = useState(false);

  const load = useCallback(async (from = '', to = '', lim = 10) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to)   params.set('to',   to);
    params.set('limit', lim);
    const qs = `?${params}`;
    try {
      const [s, h] = await Promise.all([
        api(`/stats${qs}`),
        api(`/history${qs}`),
      ]);
      setStats(s);
      setHistory(h.history || []);
      setTotalCount(s.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load('', '', 10); }, [load]);

  const applyFilter = () => {
    setLimit(50); setFilterActive(true); setShowFilter(false);
    load(dateFrom, dateTo, 50);
  };

  const clearFilter = () => {
    setDateFrom(''); setDateTo('');
    setFilterActive(false); setShowFilter(false); setLimit(10);
    load('', '', 10);
  };

  const loadMore = () => {
    const n = limit + 10; setLimit(n);
    load(dateFrom, dateTo, n);
  };

  if (loading) return <div className="dash-loading">Loading dashboard…</div>;

  const topDefects = Object.entries(stats?.defect_frequency || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxFreq = topDefects[0]?.[1] || 1;
  const hasMore = history.length >= limit && history.length < totalCount;

  return (
    <div className="dashboard-page">
      <div className="kpi-grid">
        {[
          { label: 'Total inspections', value: stats?.total    || 0, cls: '' },
          { label: 'Pass rate',         value: `${stats?.pass_rate || 0}%`, cls: 'kpi-pass' },
          { label: 'Review',            value: stats?.review   || 0, cls: 'kpi-review' },
        ].map(k => (
          <div key={k.label} className={`kpi-card ${k.cls}`}>
            <span className="kpi-label">{k.label}</span>
            <span className="kpi-value">{k.value}</span>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="section-card">
          <h3 className="section-title">Defect frequency</h3>
          {topDefects.length === 0
            ? <p className="empty-state">No defects recorded yet.</p>
            : <div className="freq-list">
                {topDefects.map(([cls, cnt]) => (
                  <div key={cls} className="freq-row">
                    <span className="freq-label">{DEFECT_LABELS[cls] || cls}</span>
                    <div className="freq-track">
                      <div className="freq-fill" style={{ width: `${(cnt / maxFreq) * 100}%` }} />
                    </div>
                    <span className="freq-count">{cnt}</span>
                  </div>
                ))}
              </div>
          }
        </div>

        <div className="section-card">
          <h3 className="section-title">Verdict breakdown</h3>
          <div className="verdict-breakdown">
            {[
              { key: 'passed', label: 'Pass',   cls: 'vb-pass'   },
              { key: 'review', label: 'Review', cls: 'vb-review' },
            ].map(({ key, label, cls }) => {
              const val = stats?.[key] || 0;
              const pct = stats?.total > 0 ? Math.round(val / stats.total * 100) : 0;
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
              );
            })}
          </div>
        </div>
      </div>

      <div className="section-card">
        <div className="hist-header">
          <h3 className="section-title" style={{ margin: 0 }}>
            Inspection history
            {filterActive && (
              <span className="filter-badge"> · {dateFrom} to {dateTo}</span>
            )}
          </h3>
          <button
            className={`btn-ghost btn-sm ${showFilter ? 'active' : ''}`}
            onClick={() => setShowFilter(!showFilter)}>
            {showFilter ? 'Hide' : '📅 Custom date range'}
          </button>
        </div>

        {showFilter && (
          <div className="date-filter" style={{ marginTop: '1rem' }}>
            <span style={{ fontSize: '13px', color: 'var(--text2)' }}>From</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <span style={{ fontSize: '13px', color: 'var(--text2)' }}>To</span>
            <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)} />
            <button className="btn-primary btn-sm" onClick={applyFilter}>Apply</button>
            {filterActive && (
              <button className="btn-ghost btn-sm" onClick={clearFilter}>Clear</button>
            )}
          </div>
        )}

        {history.length === 0
          ? <p className="empty-state" style={{ marginTop: '1rem' }}>No inspections found.</p>
          : <>
              <div className="table-wrap" style={{ marginTop: '1rem' }}>
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
                <div style={{ display: 'flex', gap: '8px' }}>
                  {hasMore && (
                    <button className="btn-ghost btn-sm" onClick={loadMore}>
                      See more
                    </button>
                  )}
                  {filterActive && (
                    <button className="btn-ghost btn-sm" onClick={clearFilter}>
                      Show all
                    </button>
                  )}
                </div>
              </div>
            </>
        }
      </div>
    </div>
  );
}

// ── App Shell ─────────────────────────────────
export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('token'));
  const [user,  setUser]  = useState(() => {
    const u = sessionStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });
  const [authPage, setAuthPage] = useState('login');  // login | register
  const [tab,      setTab]      = useState('inspect');

  const onLogin = (t, u) => {
    setToken(t); setUser(u);
    sessionStorage.setItem('token', t);
    sessionStorage.setItem('user',  JSON.stringify(u));
    setTab('inspect');
  };

  const onLogout = () => {
    setToken(null); setUser(null);
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  };

  // ── Not logged in ──
  if (!token) {
    return authPage === 'login'
      ? <LoginPage    onLogin={onLogin} onGoRegister={() => setAuthPage('register')} />
      : <RegisterPage onLogin={onLogin} onGoLogin={()    => setAuthPage('login')}    />;
  }

  // ── Logged in ──
  return (
    <div className="shell">
      <header className="shell-header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-mark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <div>
              <span className="brand-name">DefectIQ</span>
              <span className="brand-sub">Plywood inspection system</span>
            </div>
          </div>

          <nav className="tab-nav">
            <button className={`tab-btn ${tab === 'inspect'   ? 'active' : ''}`} onClick={() => setTab('inspect')}>
              Inspect
            </button>
            <button className={`tab-btn ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>
              Dashboard
            </button>
          </nav>

          <div className="header-right">
            <div className="user-info">
              <span className="user-name">{user?.full_name}</span>
              <span className="user-factory">{user?.factory_name}</span>
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
        <span>Chandupa Marapana · IIT × University of Westminster</span>
      </footer>
    </div>
  );
}

