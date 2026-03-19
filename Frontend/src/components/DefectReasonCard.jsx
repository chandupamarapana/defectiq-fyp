// frontend/src/components/DefectReasonCard.jsx
const LABELS = {
    bubbling: 'Bubbling', delamination: 'Delamination',
    imprint_on_surface: 'Imprint on Surface', missing_edges: 'Missing Edges',
    missing_top_face: 'Missing Top Face', warping: 'Warping',
}

export default function DefectReasonCard({ defect, info, confidence }) {
    const pct = Math.round((confidence || 0) * 100)
    return (
        <div className="defect-reason-card">
            <div className="dr-header">
                <span className="dr-name">{LABELS[defect] || defect}</span>
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
    )
}