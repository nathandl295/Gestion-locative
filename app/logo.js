import Link from 'next/link'

export default function Logo({ white = false }) {
  const textColor = white ? 'white' : '#0f172a'
  return (
    <Link href="/dashboard">
      <svg width="180" height="44" viewBox="0 0 180 44">
        <rect x="2" y="4" width="6" height="36" rx="3" fill="#2563eb"/>
        <rect x="13" y="10" width="6" height="30" rx="3" fill="#2563eb" opacity="0.6"/>
        <rect x="24" y="0" width="6" height="44" rx="3" fill="#2563eb" opacity="0.3"/>
        <text x="42" y="30" fontFamily="system-ui" fontWeight="700" fontSize="22" fill={textColor} letterSpacing="-0.5">GestImmo</text>
      </svg>
    </Link>
  )
}