// frontend/src/components/DefectReasonCard.jsx
const LABELS = {
    bubbling:           'Bubbling',
    delamination:       'Delamination',
    imprint_on_surface: 'Imprint on Surface',
    missing_face:       'Missing Face',
    warping:            'Warping',
}

export default function DefectReasonCard({ defect, info, confidence }) {
    const pct = Math.round((confidence || 0) * 100)
    return (
        <div className="defect-reason-card">
            <div className="dr-header">
                <div className="dr-name-wrap">
                    <span className="dr-icon">!</span>
                    <span className="dr-name">{LABELS[defect] || defect}</span>
                </div>
                <span className="dr-conf-badge">{pct}% confidence</span>
            </div>
            <p className="dr-summary">{info.summary}</p>
            <div className="dr-recs">
                <span className="dr-recs-title">Recommendations</span>
                <ul>
                    {(info.recommendations || []).map((r, i) => <li key={i}>{r}</li>)}
                </ul>
            </div>
        </div>
    )
}
