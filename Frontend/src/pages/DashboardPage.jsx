// frontend/src/pages/DashboardPage.jsx
import { useState, useEffect, useCallback } from 'react'
import { fetchStats, fetchHistory } from '../api'

const LABELS = {
    bubbling:           'Bubbling',
    delamination:       'Delamination',
    imprint_on_surface: 'Imprint on Surface',
    missing_edges:      'Missing Edges',
    missing_top_face:   'Missing Top Face',
    warping:            'Warping',
}

export default function DashboardPage({ token }) {
    const [stats,        setStats]        = useState(null)
    const [history,      setHistory]      = useState([])
    const [loading,      setLoading]      = useState(true)
    const [showFilter,   setShowFilter]   = useState(false)
    const [dateFrom,     setDateFrom]     = useState('')
    const [dateTo,       setDateTo]       = useState('')
    const [limit,        setLimit]        = useState(10)
    const [totalCount,   setTotalCount]   = useState(0)
    const [filterActive, setFilterActive] = useState(false)

    const load = useCallback(async (from = '', to = '', lim = 10) => {
        setLoading(true)
        const params = {}
        if (from) params.from = from
        if (to)   params.to   = to
        try {
            const [s, h] = await Promise.all([
                fetchStats(token, params),
                fetchHistory(token, { ...params, limit: lim }),
            ])
            setStats(s)
            setHistory(h.history || [])
            setTotalCount(s.total || 0)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [token])

    useEffect(() => { load('', '', 10) }, [load])

    const applyFilter = () => {
        setLimit(50); setFilterActive(true); setShowFilter(false)
        load(dateFrom, dateTo, 50)
    }

    const clearFilter = () => {
        setDateFrom(''); setDateTo('')
        setFilterActive(false); setShowFilter(false); setLimit(10)
        load('', '', 10)
    }

    const loadMore = () => {
        const n = limit + 10; setLimit(n)
        load(dateFrom, dateTo, n)
    }

    if (loading) return <div className="dash-loading">Loading dashboard…</div>

    const topDefects = Object.entries(stats?.defect_frequency || {})
        .sort((a, b) => b[1] - a[1]).slice(0, 6)
    const maxFreq = topDefects[0]?.[1] || 1
    const hasMore = history.length >= limit && history.length < totalCount

    return (
        <div className="dashboard-page">

            <div className="kpi-grid">
                {[
                    { label: 'Total inspections', value: stats?.total    || 0, cls: '' },
                    { label: 'Pass rate',          value: `${stats?.pass_rate || 0}%`, cls: 'kpi-pass' },
                    { label: 'Review',             value: stats?.review   || 0, cls: 'kpi-review' },
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
                                    <span className="freq-label">{LABELS[cls] || cls}</span>
                                    <div className="freq-track">
                                        <div className="freq-fill"
                                            style={{ width: `${(cnt / maxFreq) * 100}%` }} />
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
                            const val = stats?.[key] || 0
                            const pct = stats?.total > 0 ? Math.round(val / stats.total * 100) : 0
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
                    ? <p className="empty-state" style={{ marginTop: '1rem' }}>
                        No inspections found.
                      </p>
                    : <>
                        <div className="table-wrap" style={{ marginTop: '1rem' }}>
                            <table className="hist-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Date &amp; Time</th>
                                        <th>Verdict</th>
                                        <th>Defects detected</th>
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
                                                            {LABELS[d] || d}
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
    )
}
