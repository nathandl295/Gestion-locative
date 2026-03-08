import Logo from './logo'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6">
      <Logo />
      <div className="text-center">
        <p className="text-8xl font-bold text-gray-200">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Page introuvable</h1>
        <p className="text-gray-500 mt-2">Cette page n'existe pas ou a ete deplacee.</p>
      </div>
      <a href="/dashboard" className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 font-medium">
        Retour au dashboard
      </a>
    </div>
  )
}