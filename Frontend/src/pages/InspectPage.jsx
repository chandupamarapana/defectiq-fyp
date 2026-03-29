// frontend/src/pages/InspectPage.jsx
import { useState, useCallback } from 'react'
import { detectDefects } from '../api'
import VerdictBanner from '../components/VerdictBanner'
import ConfidenceBar from '../components/ConfidenceBar'
import DefectReasonCard from '../components/DefectReasonCard'

const DEFECT_LABELS = {
    bubbling:           'Bubbling',
    delamination:       'Delamination',
    imprint_on_surface: 'Imprint on Surface',
    missing_face:       'Missing Face',
    warping:            'Warping',
}

// ── Upload Zone ──────────────────────────────────
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
                    <div className="upload-icon-wrap">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                        </svg>
                    </div>
                    <p>Drop image or click to browse</p>
                    <span>Supports JPG, PNG, WEBP</span>
                  </div>
            }
            <input type="file" accept="image/*" onChange={onChange}
                disabled={disabled} className="file-input" />
            <div className="upload-label-tag">{label}</div>
        </div>
    )
}

// ── Annotated image with click-to-expand ─────────
function AnnImage({ base64, label, defects }) {
    const [expanded, setExpanded] = useState(false)
    return (
        <div
            className={`ann-wrap ${expanded ? 'ann-expanded' : ''}`}
            onClick={() => setExpanded(e => !e)}
        >
            <span className="ann-label">{label} {expanded ? '[-]' : '[+]'}</span>
            <img
                src={`data:image/jpeg;base64,${base64}`}
                alt={`${label} annotated`}
            />
            {defects && defects.length > 0 && (
                <div className="ann-defects">
                    {defects.map(d => (
                        <span key={d} className="ann-defect-chip">
                            {DEFECT_LABELS[d] || d}
                        </span>
                    ))}
                </div>
            )}
        </div>
    )
}

// ── Main Inspect Page ────────────────────────────
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

    // ── Results view ─────────────────────────────
    if (results) {
        const detected   = new Set(results.defects || [])
        const conf       = results.confidences || {}
        const defectList = results.defects || []
        const hasImages  = results.annotated_images?.top_view || results.annotated_images?.side_view

        return (
            <div className="inspect-results-wide">

                {/* Row 1 — Verdict + confidence */}
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

                {/* Row 2 — Images LEFT, Reasons RIGHT */}
                <div className="results-split">

                    {/* Left — annotated images */}
                    {hasImages && (
                        <div className="results-left">
                            <div className="section-card" style={{ height: '100%' }}>
                                <h3 className="section-title">
                                    Board images — click to expand
                                </h3>
                                <div className="annotated-stack">
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
                        </div>
                    )}

                    {/* Right — defect reasons */}
                    <div className={hasImages ? 'results-right' : 'results-right-full'}>
                        {defectList.length > 0 && (
                            <div className="section-card" style={{ height: '100%' }}>
                                <h3 className="section-title">
                                    Defect analysis and recommendations
                                </h3>
                                {defectList.map(d => (
                                    <DefectReasonCard
                                        key={d}
                                        defect={d}
                                        info={results.defect_info?.[d] || {}}
                                        confidence={conf[d]}
                                    />
                                ))}
                            </div>
                        )}

                        {defectList.length === 0 && (
                            <div className="section-card">
                                <div className="pass-state">
                                    <div className="pass-icon">&#10003;</div>
                                    <p>No defects detected above threshold</p>
                                    <span>Board passes quality inspection</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="action-row" style={{ marginTop: '0.5rem' }}>
                    <button className="btn-primary" onClick={reset}>
                        + Inspect new board
                    </button>
                    <button className="btn-ghost" onClick={submit} disabled={loading}>
                        {loading ? <><span className="spinner" /> Re-analysing...</> : 'Re-analyse'}
                    </button>
                </div>
            </div>
        )
    }

    // ── Upload view ──────────────────────────────
    return (
        <div className="inspect-upload-wide">
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
                        ? <><span className="spinner" /> Analysing...</>
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
