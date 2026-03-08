export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          GestImmo
        </h1>
        <p className="text-gray-500 text-lg mb-8">
          Gestion locative simplifiée
        </p>
        <a
          href="/dashboard"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
        >
          Accéder au tableau de bord →
        </a>
      </div>
    </div>
  )
}