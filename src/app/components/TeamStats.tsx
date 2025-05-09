'use client';

import { useState } from 'react';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TeamStatsProps {
  statistics: any | null;
}

export default function TeamStats({ statistics }: TeamStatsProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const defaultMinuteData = {
    '0-15': { total: 0, percentage: '0%' },
    '16-30': { total: 0, percentage: '0%' },
    '31-45': { total: 0, percentage: '0%' },
    '46-60': { total: 0, percentage: '0%' },
    '61-75': { total: 0, percentage: '0%' },
    '76-90': { total: 0, percentage: '0%' }
  };

  // Use the existing statistics or default values
  const stats = {
    fixtures: statistics?.fixtures || { played: { total: 0 }, wins: { total: 0 }, draws: { total: 0 }, loses: { total: 0 } },
    goals: {
      for: { 
        total: statistics?.goals?.for?.total || { total: 0 },
        minute: statistics?.goals?.for?.minute || defaultMinuteData
      },
      against: { 
        total: statistics?.goals?.against?.total || { total: 0 },
        minute: statistics?.goals?.against?.minute || defaultMinuteData
      }
    },
    clean_sheet: statistics?.clean_sheet || { total: 0, home: 0, away: 0 }
  };

  // Add debug logging
  console.log('Raw statistics:', JSON.stringify(statistics, null, 2));

  if (!statistics || !statistics.fixtures) {
    return null;
  }

  // Enhanced color palette
  const colors = {
    primary: {
      win: 'rgba(22, 163, 74, 0.8)',      // Green
      draw: 'rgba(234, 179, 8, 0.8)',     // Yellow
      loss: 'rgba(220, 38, 38, 0.8)',     // Red
      home: 'rgba(37, 99, 235, 0.8)',     // Blue
      away: 'rgba(99, 102, 241, 0.8)',    // Indigo
    },
    border: {
      win: 'rgba(22, 163, 74, 1)',
      draw: 'rgba(234, 179, 8, 1)',
      loss: 'rgba(220, 38, 38, 1)',
      home: 'rgba(37, 99, 235, 1)',
      away: 'rgba(99, 102, 241, 1)',
    }
  };

  // Helper function to safely get total value
  const getTotal = (obj: any): number => {
    if (!obj) return 0;
    if (typeof obj === 'number') return obj;
    if (typeof obj === 'object') {
      if ('total' in obj) return obj.total || 0;
      if ('total' in obj.total) return obj.total.total || 0;
    }
    return 0;
  };

  // Helper function to safely get nested value
  const getSafeValue = (path: string): number => {
    const value = path.split('.').reduce((obj, key) => obj?.[key], statistics);
    return getTotal(value);
  };

  // Log all the values we're trying to render
  console.log('Values being rendered:', {
    played: getSafeValue('fixtures.played'),
    wins: getSafeValue('fixtures.wins'),
    draws: getSafeValue('fixtures.draws'),
    loses: getSafeValue('fixtures.loses'),
    goalsFor: getSafeValue('goals.for'),
    goalsAgainst: getSafeValue('goals.against'),
    cleanSheet: getSafeValue('clean_sheet'),
    cleanSheetHome: statistics.clean_sheet?.home,
    cleanSheetAway: statistics.clean_sheet?.away,
  });

  // Goals data with safe fallbacks
  const goalsData = {
    labels: ['0-15', '16-30', '31-45', '46-60', '61-75', '76-90'],
    datasets: [
      {
        label: 'Mål scoret',
        data: Object.keys(defaultMinuteData).map(() => 0), // Default to zeros if no data
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1
      },
      {
        label: 'Mål imot',
        data: Object.keys(defaultMinuteData).map(() => 0), // Default to zeros if no data
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1
      }
    ]
  };

  // Performance data with safe fallbacks
  const performanceData = {
    labels: ['Seire', 'Uavgjort', 'Tap', 'Mål scoret', 'Mål imot'],
    datasets: [
      {
        label: 'Hjemme',
        data: [
          statistics?.fixtures?.wins?.home || 0,
          statistics?.fixtures?.draws?.home || 0,
          statistics?.fixtures?.loses?.home || 0,
          statistics?.goals?.for?.total?.home || 0,
          statistics?.goals?.against?.total?.home || 0
        ],
        backgroundColor: 'rgba(37, 99, 235, 0.8)',
        borderColor: 'rgba(37, 99, 235, 1)',
        borderWidth: 1
      },
      {
        label: 'Borte',
        data: [
          statistics?.fixtures?.wins?.away || 0,
          statistics?.fixtures?.draws?.away || 0,
          statistics?.fixtures?.loses?.away || 0,
          statistics?.goals?.for?.total?.away || 0,
          statistics?.goals?.against?.total?.away || 0
        ],
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1
      }
    ]
  };

  // Cards data with safe fallbacks
  const cardsData = {
    labels: ['0-15', '16-30', '31-45', '46-60', '61-75', '76-90'],
    datasets: [
      {
        label: 'Gule kort',
        data: Object.keys(defaultMinuteData).map(() => 0),
        backgroundColor: 'rgba(234, 179, 8, 0.5)',
        borderColor: 'rgb(234, 179, 8)',
        borderWidth: 1
      },
      {
        label: 'Røde kort',
        data: Object.keys(defaultMinuteData).map(() => 0),
        backgroundColor: 'rgba(220, 38, 38, 0.5)',
        borderColor: 'rgb(220, 38, 38)',
        borderWidth: 1
      }
    ]
  };

  const tabs = [
    { id: 'overview', label: 'Oversikt' },
    { id: 'performance', label: 'Prestasjon' },
  ];

  // Chart data for results distribution
  const chartData = {
    labels: ['Seire', 'Uavgjort', 'Tap'],
    datasets: [
      {
        data: [statistics?.fixtures?.wins?.total || 0, statistics?.fixtures?.draws?.total || 0, statistics?.fixtures?.loses?.total || 0],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
        borderColor: ['#10B981', '#F59E0B', '#EF4444'],
        borderWidth: 1,
      },
    ],
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'rgb(156, 163, 175)', // gray-400 for both light and dark mode
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = statistics?.fixtures?.played?.total || 0;
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
  };

  return (
    <div className="bg-white dark:bg-[#222222] rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-6 dark:text-white">Statistikk</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Fixtures Summary */}
        <div className="bg-gray-50 dark:bg-dark-nav p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Kamper</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="dark:text-gray-300">Spilt:</span>
              <span className="font-medium dark:text-white">{getSafeValue('fixtures.played')}</span>
            </div>
            <div className="flex justify-between">
              <span className="dark:text-gray-300">Vunnet:</span>
              <span className="font-medium text-green-600 dark:text-green-400">{getSafeValue('fixtures.wins')}</span>
            </div>
            <div className="flex justify-between">
              <span className="dark:text-gray-300">Uavgjort:</span>
              <span className="font-medium text-yellow-600 dark:text-yellow-400">{getSafeValue('fixtures.draws')}</span>
            </div>
            <div className="flex justify-between">
              <span className="dark:text-gray-300">Tapt:</span>
              <span className="font-medium text-red-600 dark:text-red-400">{getSafeValue('fixtures.loses')}</span>
            </div>
          </div>
        </div>

        {/* Goals Summary */}
        <div className="bg-gray-50 dark:bg-dark-nav p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Mål</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="dark:text-gray-300">Scoret:</span>
              <span className="font-medium text-green-600 dark:text-green-400">{getTotal(statistics.goals?.for?.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="dark:text-gray-300">Innsluppet:</span>
              <span className="font-medium text-red-600 dark:text-red-400">{getTotal(statistics.goals?.against?.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="dark:text-gray-300">Målforskjell:</span>
              <span className={`font-medium ${
                (getTotal(statistics.goals?.for?.total) - getTotal(statistics.goals?.against?.total)) > 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : (getTotal(statistics.goals?.for?.total) - getTotal(statistics.goals?.against?.total)) < 0 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-gray-600 dark:text-gray-400'
              }`}>
                {getTotal(statistics.goals?.for?.total) - getTotal(statistics.goals?.against?.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Clean Sheets */}
        <div className="bg-gray-50 dark:bg-dark-nav p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Clean Sheets</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="dark:text-gray-300">Totalt:</span>
              <span className="font-medium dark:text-white">{getTotal(statistics.clean_sheet)}</span>
            </div>
            <div className="flex justify-between">
              <span className="dark:text-gray-300">Hjemme:</span>
              <span className="font-medium dark:text-white">{statistics.clean_sheet?.home || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="dark:text-gray-300">Borte:</span>
              <span className="font-medium dark:text-white">{statistics.clean_sheet?.away || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mt-8 border-b dark:border-gray-700">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Results Distribution */}
            <div className="max-w-sm mx-auto">
              <h3 className="text-lg font-semibold mb-4 text-center dark:text-white">Resultatfordeling</h3>
              <Doughnut data={chartData} options={chartOptions} />
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 dark:text-white">Hjemme vs. Borte prestasjon</h3>
              <div className="h-64">
                <Bar
                  data={performanceData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true
                      }
                    },
                    plugins: {
                      legend: {
                        position: 'bottom'
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 