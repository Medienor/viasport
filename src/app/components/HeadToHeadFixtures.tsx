"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with the same configuration
const supabase = createClient(
  'https://cdynfbwdwdfsiwkgixua.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkeW5mYndkd2Rmc2l3a2dpeHVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjU3ODQwMSwiZXhwIjoyMDU4MTU0NDAxfQ.5V7CbSCE4lb3FbJUa3kgipRPWXG4LeVRCf7eeLSrSoI'
);

interface HeadToHeadFixturesProps {
  matches: any[]; // Type this properly based on your data structure
}

async function checkFixtureExists(fixtureId: number) {
  const { data } = await supabase
    .from('fixtures')
    .select('id')
    .eq('id', fixtureId)
    .single();
  
  return !!data;
}

export default function HeadToHeadFixtures({ matches }: HeadToHeadFixturesProps) {
  return (
    <div className="space-y-3">
      {matches
        .sort((a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime())
        .map((game) => {
          const MatchContent = ({ children }: { children: React.ReactNode }) => {
            const [exists, setExists] = useState<boolean | null>(null);

            useEffect(() => {
              const checkFixture = async () => {
                const exists = await checkFixtureExists(game.fixture.id);
                setExists(exists);
              };
              checkFixture();
            }, []);

            if (exists === null) return children;
            if (exists) {
              return (
                <Link 
                  href={`/fotball/kamp/${game.fixture.id}`} 
                  className="block hover:bg-gray-100 transition-colors bg-gray-50 rounded"
                >
                  {children}
                </Link>
              );
            }
            return <div className="block bg-white rounded">{children}</div>;
          };

          return (
            <MatchContent key={game.fixture.id}>
              {/* Desktop version */}
              <div className="hidden md:flex items-center justify-between px-2 py-3 text-sm">
                <div className="text-gray-600 min-w-[200px]">
                  {new Date(game.fixture.date).toLocaleDateString('no-NO', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                  <span className="mx-2">•</span>
                  {game.league.name}
                </div>

                <div className="flex items-center justify-end w-[340px]">
                  <div className="flex items-center justify-end w-[140px]">
                    <span className="truncate">{game.teams.home.name}</span>
                    <Image
                      src={game.teams.home.logo}
                      alt={game.teams.home.name}
                      width={20}
                      height={20}
                      className="ml-2 flex-shrink-0"
                    />
                  </div>

                  <div className="flex items-center justify-center w-[60px]">
                    <span className={`${game.teams.home.winner ? 'text-green-600' : ''}`}>
                      {game.goals.home}
                    </span>
                    <span className="mx-1 text-gray-400">-</span>
                    <span className={`${game.teams.away.winner ? 'text-green-600' : ''}`}>
                      {game.goals.away}
                    </span>
                  </div>

                  <div className="flex items-center justify-start w-[140px]">
                    <Image
                      src={game.teams.away.logo}
                      alt={game.teams.away.name}
                      width={20}
                      height={20}
                      className="mr-2 flex-shrink-0"
                    />
                    <span className="truncate">{game.teams.away.name}</span>
                  </div>
                </div>
              </div>

              {/* Mobile version */}
              <div className="md:hidden p-3">
                <div className="space-y-3">
                  {/* Date and league */}
                  <div className="text-xs text-gray-600">
                    {new Date(game.fixture.date).toLocaleDateString('no-NO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                    <span className="mx-2">•</span>
                    {game.league.name}
                  </div>

                  {/* Teams and score */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1">
                      <Image
                        src={game.teams.home.logo}
                        alt={game.teams.home.name}
                        width={20}
                        height={20}
                        className="flex-shrink-0"
                      />
                      <span className="truncate text-sm">{game.teams.home.name}</span>
                    </div>

                    <div className="flex items-center justify-center mx-4">
                      <span className={`text-sm ${game.teams.home.winner ? 'text-green-600' : ''}`}>
                        {game.goals.home}
                      </span>
                      <span className="mx-1 text-gray-400">-</span>
                      <span className={`text-sm ${game.teams.away.winner ? 'text-green-600' : ''}`}>
                        {game.goals.away}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 flex-1 justify-end">
                      <span className="truncate text-sm">{game.teams.away.name}</span>
                      <Image
                        src={game.teams.away.logo}
                        alt={game.teams.away.name}
                        width={20}
                        height={20}
                        className="flex-shrink-0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </MatchContent>
          );
        })}
    </div>
  );
} 