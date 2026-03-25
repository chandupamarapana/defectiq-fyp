import './globals.css'

export const metadata = {
  title: 'DefectIQ — Plywood Defect Detection',
  description: 'Real-time post-manufactured plywood defect detection system',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
