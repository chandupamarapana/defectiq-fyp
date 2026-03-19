// frontend/src/components/ConfidenceBar.jsx
const LABELS = {
    bubbling: 'Bubbling', delamination: 'Delamination',
    imprint_on_surface: 'Imprint on Surface', missing_edges: 'Missing Edges',
    missing_top_face: 'Missing Top Face', warping: 'Warping',
}

export default function ConfidenceBar({ label, value, detected }) {
    const pct = Math.round(value * 100)
    return (
        <div className={`conf-row ${detected ? 'detected' : ''}`}>
            <span className="conf-label">{LABELS[label] || label}</span>
            <div className="conf-track">
                <div className="conf-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="conf-pct">{pct}%</span>
            {detected && <span className="conf-tag">DETECTED</span>}
        </div>
    )
}