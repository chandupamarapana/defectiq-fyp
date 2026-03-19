// frontend/src/pages/InspectPage.jsx
import { useState, useCallback } from 'react'
import { detectDefects } from '../api'
import VerdictBanner from '../components/VerdictBanner'
import ConfidenceBar from '../components/ConfidenceBar'
import DefectReasonCard from '../components/DefectReasonCard'

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
            onDrop={onDrop}>
            {preview
                ? <img src={preview} alt={label} className="preview-img" />
                : <div className="upload-placeholder">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                    </svg>
                    <p>Drop image or click to browse</p>
                  </div>
            }
            <input type="file" accept="image/*" onChange={onChange}
                disabled={disabled} className="file-input" />
            <div className="upload-label-tag">{label}</div>
        </div>
    )
}

export default function InspectPage({ token }) {
    const [topImg,   setTopImg]   = useState(null)
    const [sideImg,  setSideImg]  = useState(null)
    const [topPrev,  setTopPrev]  = useState(null)
    const [sidePrev, setSidePrev] = useState(null)
    const [loading,  setLoading]  = useState(false)
    const [results,  setResults]  = useState(null)
    const [error,    setError]    = useState('')

    const handleTop  = e => {
        const f = e.target.files[0]
        if (f) { setTopImg(f);  setTopPrev(URL.createObjectURL(f)) }
    }
    const handleSide = e => {
        const f = e.target.files[0]
        if (f) { setSideImg(f); setSidePrev(URL.createObjectURL(f)) }
    }

    const reset = () => {
        setTopImg(null); setSideImg(null)
        setTopPrev(null); setSidePrev(null)
        setResults(null); setError('')
    }

    const submit = async () => {
        if (!topImg && !sideImg) { setError('Upload at least one image.'); return }
        setLoading(true); setError(''); setResults(null)
        const fd = new FormData()
        if (topImg)  fd.append('top_view',  topImg)
        if (sideImg) fd.append('side_view', sideImg)
        try {
            const data = await detectDefects(fd, token)
            setResults(data)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // ── Results view ──────────────────────────────────
    if (results) {
        const detected = new Set(results.defects || [])
        const conf     = results.confidences || {}

        return (
            <div className="inspect-results">

                {/* 1. Model output — verdict + confidence scores */}
                <div className="section-card">
                    <VerdictBanner verdict={results.verdict} />
                    <div className="conf-list" style={{ marginTop: '1.25rem' }}>
                        {Object.entries(conf)
                            .sort((a, b) => b[1] - a[1])
                            .map(([cls, val]) => (
                                <ConfidenceBar key={cls} label={cls}
                                    value={val} detected={detected.has(cls)} />
                            ))}
                    </div>
                </div>

                {/* 2. Annotated images with defect highlighting */}
                {(results.annotated_images?.top_view || results.annotated_images?.side_view) && (
                    <div className="section-card">
                        <h3 className="section-title">
                            Board images — defect locations highlighted
                        </h3>
                        <div className="annotated-grid">
                            {results.annotated_images?.top_view && (
                                <div className="ann-wrap">
                                    <span className="ann-label">Top view</span>
                                    <img
                                        src={`data:image/jpeg;base64,${results.annotated_images.top_view}`}
                                        alt="top annotated"
                                        style={{ width: '100%', display: 'block' }}
                                    />
                                </div>
                            )}
                            {results.annotated_images?.side_view && (
                                <div className="ann-wrap">
                                    <span className="ann-label">Side view</span>
                                    <img
                                        src={`data:image/jpeg;base64,${results.annotated_images.side_view}`}
                                        alt="side annotated"
                                        style={{ width: '100%', display: 'block' }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. Defect reasons */}
                {results.defects?.length > 0 && (
                    <div className="section-card">
                        <h3 className="section-title">
                            Defect analysis and recommendations
                        </h3>
                        {results.defects.map(d => (
                            <DefectReasonCard
                                key={d}
                                defect={d}
                                info={results.defect_info?.[d] || {}}
                                confidence={conf[d]}
                            />
                        ))}
                    </div>
                )}

                {results.defects?.length === 0 && (
                    <div className="section-card">
                        <p style={{
                            color: 'var(--pass)', textAlign: 'center',
                            padding: '1.5rem', fontSize: '15px'
                        }}>
                            ✓ No defects detected above threshold. Board passes quality inspection.
                        </p>
                    </div>
                )}

                <button className="btn-ghost" onClick={reset}
                    style={{ marginTop: '1rem' }}>
                    ← New inspection
                </button>
            </div>
        )
    }

    // ── Upload view ───────────────────────────────────
    return (
        <div className="inspect-upload">
            <p className="page-sub">
                Upload top-view and/or side-view images for dual-view defect analysis
            </p>
            <div className="upload-grid">
                <UploadZone label="Top view"  preview={topPrev}
                    onChange={handleTop}  disabled={loading} />
                <UploadZone label="Side view" preview={sidePrev}
                    onChange={handleSide} disabled={loading} />
            </div>
            {error && <div className="error-bar">{error}</div>}
            <div className="action-row">
                <button className="btn-primary" onClick={submit}
                    disabled={loading || (!topImg && !sideImg)}>
                    {loading
                        ? <><span className="spinner" /> Analysing…</>
                        : 'Analyse board'
                    }
                </button>
                <button className="btn-ghost" onClick={reset} disabled={loading}>
                    Clear
                </button>
            </div>
        </div>
    )
}
