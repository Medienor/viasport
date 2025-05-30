'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// European championships data
const europeanChampionships = [
  { id: 4, name: 'Euro', slug: 'euro-4' },
  { id: 2, name: 'Mesterligaen', slug: 'uefa-champions-league-2' },
  { id: 3, name: 'Europa Ligaen', slug: 'uefa-europa-league-3' },
  { id: 848, name: 'Conference League', slug: 'uefa-europa-conference-league-848' },
  { id: 5, name: 'UEFA Nations League', slug: 'uefa-nations-league-5' },
  { id: 6, name: 'Euro U21', slug: 'euro-u21-6' },
  { id: 493, name: 'Euro U19', slug: 'uefa-u19-championship-493' },
  { id: 1, name: 'Verdensmesterskapet i Fotball', slug: 'world-cup-1' },
  { id: 921, name: 'Euro U17', slug: 'uefa-u17-championship-921' },
  { id: 531, name: 'UEFA Super Cup', slug: 'uefa-super-cup-531' }
];

// Additional European championships (for "Vis mer")
const additionalEuropeanChampionships = [
  { id: 525, name: 'UEFA Champions League Women', slug: 'uefa-champions-league-women-525' },
  { id: 1102, name: 'UEFA U17 Championship Women', slug: 'uefa-u17-championship-women-1102' },
  { id: 918, name: 'UEFA U19 Championship Women', slug: 'uefa-u19-championship-women-918' },
  { id: 32, name: 'World Cup Qualification Europe', slug: 'world-cup-qualification-europe-32' },
  { id: 15, name: 'FIFA Club World Cup', slug: 'fifa-club-world-cup-15' },
  { id: 937, name: 'Emirates Cup', slug: 'emirates-cup-937' }
];

export default function EuropeanChampionships() {
  const [showMoreEuropean, setShowMoreEuropean] = useState(false);

  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-3 tracking-wide">
        Europa
      </h2>
      <div className="space-y-1.5">
        {europeanChampionships.map(championship => (
          <Link
            key={championship.id}
            href={`/fotball/liga/${championship.slug}`}
            className="flex items-center p-3 bg-white dark:bg-[#222222] hover:bg-gray-100 dark:hover:bg-[#333333] rounded-lg transition-colors duration-150 shadow-sm"
          >
            <div className="relative w-5 h-5 mr-3 flex-shrink-0">
              <Image
                src={`https://viasport.b-cdn.net/football/leagues/${championship.id}.png`}
                alt={championship.name}
                fill
                className="object-contain dark:brightness-110"
              />
            </div>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
              {championship.name}
            </span>
          </Link>
        ))}
        
        {/* Show additional championships if expanded */}
        {showMoreEuropean && additionalEuropeanChampionships.map(championship => (
          <Link
            key={championship.id}
            href={`/fotball/liga/${championship.slug}`}
            className="flex items-center p-3 bg-white dark:bg-[#222222] hover:bg-gray-100 dark:hover:bg-[#333333] rounded-lg transition-colors duration-150 shadow-sm"
          >
            <div className="relative w-5 h-5 mr-3 flex-shrink-0">
              <Image
                src={`https://viasport.b-cdn.net/football/leagues/${championship.id}.png`}
                alt={championship.name}
                fill
                className="object-contain dark:brightness-110"
              />
            </div>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
              {championship.name}
            </span>
          </Link>
        ))}
        
        {/* Vis mer button */}
        <button
          onClick={() => setShowMoreEuropean(!showMoreEuropean)}
          className="w-full flex items-center justify-center p-2.5 bg-white dark:bg-[#222222] hover:bg-gray-50 dark:hover:bg-[#333333] text-gray-600 dark:text-gray-400 rounded-lg transition-all duration-200 text-xs font-medium shadow-sm hover:shadow-md"
        >
          {showMoreEuropean ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              VIS MINDRE
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              VIS MER ({additionalEuropeanChampionships.length})
            </>
          )}
        </button>
      </div>
    </div>
  );
} 