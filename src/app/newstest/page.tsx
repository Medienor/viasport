import LatestNews from '../components/LatestNews';

export default function NewsTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-main py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            News Component Test Page
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Testing the LatestNews component and API responses. Check the browser console for detailed logs.
          </p>
        </div>
        
        <div className="bg-white dark:bg-[#181818] shadow-sm rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-[#333333]">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Latest News Component
            </h2>
          </div>
          <div className="p-4">
            <LatestNews />
          </div>
        </div>
        
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            Debug Instructions:
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Open browser Developer Tools (F12)</li>
            <li>• Go to the Console tab</li>
            <li>• Look for "=== FULL RAW NEWS API RESPONSE ===" logs</li>
            <li>• Refresh the page to see fresh API calls</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 