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

const TeamStats = ({ statistics }: { statistics: any }) => {
  const [activeTab, setActiveTab] = useState('overview');

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

  // Goal distribution by minute chart data
  const goalsByMinuteData = {
    labels: ['0-15', '16-30', '31-45', '46-60', '61-75', '76-90'],
    datasets: [
      {
        label: 'Mål scoret',
        data: [
          statistics.goals.for.minute['0-15']?.total || 0,
          statistics.goals.for.minute['16-30']?.total || 0,
          statistics.goals.for.minute['31-45']?.total || 0,
          statistics.goals.for.minute['46-60']?.total || 0,
          statistics.goals.for.minute['61-75']?.total || 0,
          statistics.goals.for.minute['76-90']?.total || 0,
        ],
        backgroundColor: colors.primary.win,
        borderColor: colors.border.win,
        borderWidth: 1,
      },
      {
        label: 'Mål imot',
        data: [
          statistics.goals.against.minute['0-15']?.total || 0,
          statistics.goals.against.minute['16-30']?.total || 0,
          statistics.goals.against.minute['31-45']?.total || 0,
          statistics.goals.against.minute['46-60']?.total || 0,
          statistics.goals.against.minute['61-75']?.total || 0,
          statistics.goals.against.minute['76-90']?.total || 0,
        ],
        backgroundColor: colors.primary.loss,
        borderColor: colors.border.loss,
        borderWidth: 1,
      },
    ],
  };

  // Results distribution chart data
  const resultsData = {
    labels: ['Seire', 'Uavgjort', 'Tap'],
    datasets: [{
      data: [
        statistics.fixtures.wins.total,
        statistics.fixtures.draws.total,
        statistics.fixtures.loses.total,
      ],
      backgroundColor: [colors.primary.win, colors.primary.draw, colors.primary.loss],
      borderColor: [colors.border.win, colors.border.draw, colors.border.loss],
      borderWidth: 1,
    }],
  };

  const tabs = [
    { id: 'overview', label: 'Oversikt' },
    { id: 'goals', label: 'Målstatistikk' },
    { id: 'performance', label: 'Prestasjon' },
    { id: 'discipline', label: 'Disiplin' },
  ];

  return (
    <div className="mt-8 bg-white rounded-lg shadow">
      {/* Tabs Navigation */}
      <div className="border-b">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
            {/* Form Guide */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Siste kamper</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {statistics.form.split('').map((result: string, index: number) => (
                  <div
                    key={index}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0 ${
                      result === 'W' ? 'bg-green-500' :
                      result === 'L' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}
                  >
                    {result}
                  </div>
                ))}
              </div>
            </div>

            {/* Results Distribution */}
            <div className="max-w-sm mx-auto">
              <h3 className="text-lg font-semibold mb-4 text-center">Resultatfordeling</h3>
              <Doughnut 
                data={resultsData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const total = statistics.fixtures.played.total;
                          const value = context.raw as number;
                          const percentage = ((value / total) * 100).toFixed(1);
                          return `${context.label}: ${value} (${percentage}%)`;
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="space-y-6">
            {/* Goals by Minute */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Målfordeling per spilleminutt</h3>
              <div className="h-[300px]">
                <Bar
                  data={goalsByMinuteData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                      }
                    },
                    plugins: {
                      legend: { position: 'bottom' }
                    }
                  }}
                />
              </div>
            </div>

            {/* Goals Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Mål scoret</p>
                <p className="text-3xl font-bold text-green-600">{statistics.goals.for.total.total}</p>
                <p className="text-sm text-gray-500">
                  Snitt: {statistics.goals.for.average.total} per kamp
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Mål imot</p>
                <p className="text-3xl font-bold text-red-600">{statistics.goals.against.total.total}</p>
                <p className="text-sm text-gray-500">
                  Snitt: {statistics.goals.against.average.total} per kamp
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            {/* Home vs Away Performance */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Hjemme vs. Borte prestasjon</h3>
              <div className="h-[300px]">
                <Bar
                  data={{
                    labels: ['Seire', 'Uavgjort', 'Tap', 'Mål scoret', 'Mål imot'],
                    datasets: [
                      {
                        label: 'Hjemme',
                        data: [
                          statistics.fixtures.wins.home,
                          statistics.fixtures.draws.home,
                          statistics.fixtures.loses.home,
                          statistics.goals.for.total.home,
                          statistics.goals.against.total.home,
                        ],
                        backgroundColor: colors.primary.home,
                        borderColor: colors.border.home,
                        borderWidth: 1,
                      },
                      {
                        label: 'Borte',
                        data: [
                          statistics.fixtures.wins.away,
                          statistics.fixtures.draws.away,
                          statistics.fixtures.loses.away,
                          statistics.goals.for.total.away,
                          statistics.goals.against.total.away,
                        ],
                        backgroundColor: colors.primary.away,
                        borderColor: colors.border.away,
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                      }
                    },
                    plugins: {
                      legend: { position: 'bottom' }
                    }
                  }}
                />
              </div>
            </div>

            {/* Formations */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Foretrukne formasjoner</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {statistics.lineups.map((lineup: any, index: number) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-xl font-semibold">{lineup.formation}</p>
                    <p className="text-sm text-gray-600">{lineup.played} kamper</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'discipline' && (
          <div className="space-y-6">
            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-yellow-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Gule kort</h3>
                <p className="text-3xl font-bold text-yellow-600">
                  {Object.values(statistics.cards.yellow).reduce((acc: number, curr: any) => 
                    acc + (curr.total || 0), 0)}
                </p>
              </div>
              <div className="p-6 bg-red-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Røde kort</h3>
                <p className="text-3xl font-bold text-red-600">
                  {Object.values(statistics.cards.red).reduce((acc: number, curr: any) => 
                    acc + (curr.total || 0), 0)}
                </p>
              </div>
            </div>

            {/* Clean Sheets & Failed to Score */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Clean sheets</h3>
                <p className="text-3xl font-bold text-blue-600">{statistics.clean_sheet.total}</p>
              </div>
              <div className="p-6 bg-orange-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Kamper uten scoring</h3>
                <p className="text-3xl font-bold text-orange-600">{statistics.failed_to_score.total}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamStats; 