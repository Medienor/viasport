"use client"

import { useState } from 'react';
import Image from 'next/image';
import TeamStandings from './TeamStandings';
import TeamInjuries from './TeamInjuries';
import TeamTransfers from './TeamTransfers';

// No API calls to disable in this file as it's just a UI component

interface Team {
  id: number;
  name: string;
  country: string;
  founded: number;
  logo: string;
  venue: {
    id: number;
    name: string;
    address: string;
    city: string;
    capacity: number;
    surface: string;
    image: string;
  };
  leagueId: number;
}

interface TeamContentProps {
  team: Team;
}

export default function TeamContent({ team }: TeamContentProps) {
  const [activeTab, setActiveTab] = useState('standings');
  
  const tabs = [
    { id: 'standings', label: 'Tabell' },
    { id: 'injuries', label: 'Skader' },
    { id: 'transfers', label: 'Overganger' },
  ];
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <div className="relative h-24 w-24 mr-4">
          <Image
            src={team.logo}
            alt={team.name}
            fill
            style={{ objectFit: 'contain' }}
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{team.name}</h1>
          <p className="text-gray-600">
            {team.venue.name}, {team.venue.city} • Grunnlagt: {team.founded}
          </p>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
      
      <div className="mt-6">
        {activeTab === 'standings' && <TeamStandings teamId={team.id} leagueId={team.leagueId} />}
        {activeTab === 'injuries' && <TeamInjuries teamId={team.id} />}
        {activeTab === 'transfers' && <TeamTransfers teamId={team.id} />}
      </div>
    </div>
  );
} 