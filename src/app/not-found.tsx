import Link from 'next/link';

// Add this line to prevent static rendering
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-700 mb-6">Siden ble ikke funnet</h2>
      <p className="text-gray-500 mb-8">
        Beklager, vi kunne ikke finne siden du leter etter.
      </p>
      <Link 
        href="/"
        className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
      >
        Gå til forsiden
      </Link>
    </div>
  );
} 