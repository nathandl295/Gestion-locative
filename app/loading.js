export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <svg width="60" height="60" viewBox="0 0 60 60">
        <rect x="2" y="10" width="10" height="40" rx="5" fill="#2563eb">
          <animate attributeName="height" values="40;20;40" dur="1s" begin="0s" repeatCount="indefinite"/>
          <animate attributeName="y" values="10;20;10" dur="1s" begin="0s" repeatCount="indefinite"/>
        </rect>
        <rect x="22" y="10" width="10" height="40" rx="5" fill="#2563eb" opacity="0.6">
          <animate attributeName="height" values="40;20;40" dur="1s" begin="0.2s" repeatCount="indefinite"/>
          <animate attributeName="y" values="10;20;10" dur="1s" begin="0.2s" repeatCount="indefinite"/>
        </rect>
        <rect x="42" y="10" width="10" height="40" rx="5" fill="#2563eb" opacity="0.3">
          <animate attributeName="height" values="40;20;40" dur="1s" begin="0.4s" repeatCount="indefinite"/>
          <animate attributeName="y" values="10;20;10" dur="1s" begin="0.4s" repeatCount="indefinite"/>
        </rect>
      </svg>
      <p className="text-sm text-gray-400 font-medium">Chargement...</p>
    </div>
  )
}