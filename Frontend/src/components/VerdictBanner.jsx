// frontend/src/components/VerdictBanner.jsx
export default function VerdictBanner({ verdict }) {
    const map = {
        PASS:   {
            cls:  'verdict-pass',
            icon: '✓',
            text: 'PASS — Board is acceptable for use'
        },
        REVIEW: {
            cls:  'verdict-review',
            icon: '!',
            text: 'REVIEW — Defects detected, manual inspection required'
        },
        // Keep FAIL mapping as fallback in case old data has it
        FAIL:   {
            cls:  'verdict-review',
            icon: '!',
            text: 'REVIEW — Defects detected, manual inspection required'
        },
    }
    const v = map[verdict] || map.REVIEW
    return (
        <div className={`verdict-banner ${v.cls}`}>
            <span className="verdict-icon">{v.icon}</span>
            <span className="verdict-text">{v.text}</span>
        </div>
    )
}
