"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';

// Initialize Supabase client with the same configuration
const supabase = createClient(
  'https://cdynfbwdwdfsiwkgixua.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkeW5mYndkd2Rmc2l3a2dpeHVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjU3ODQwMSwiZXhwIjoyMDU4MTU0NDAxfQ.5V7CbSCE4lb3FbJUa3kgipRPWXG4LeVRCf7eeLSrSoI'
);

interface HeadToHeadFixturesProps {
  matches: any[];
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
        .filter(match => match.goals?.home !== null && match.goals?.away !== null)
        .sort((a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime())
        .map((match) => (
          <div 
            key={match.fixture.id}
            className="block bg-gray-50 rounded-lg p-4"
          >
            <div className="text-xs text-gray-500 mb-2">
              {format(parseISO(match.fixture.date), 'd. MMMM yyyy', { locale: nb })}
              {match.league && ` • ${match.league.name}`}
            </div>
            
            <div className="grid grid-cols-[1fr_80px_1fr] items-center">
              <div className="flex items-center gap-3">
                <img 
                  src={match.teams.home.logo} 
                  alt={match.teams.home.name}
                  className="w-6 h-6 object-contain"
                />
                <span className="font-medium">{match.teams.home.name}</span>
              </div>
              
              <div className="font-semibold text-center">
                {match.match_status === 'NS' ? '-' : `${match.goals.home} - ${match.goals.away}`}
              </div>
              
              <div className="flex items-center gap-3 justify-end">
                <span className="font-medium">{match.teams.away.name}</span>
                <img 
                  src={match.teams.away.logo} 
                  alt={match.teams.away.name}
                  className="w-6 h-6 object-contain"
                />
              </div>
            </div>
          </div>
        ))}
    </div>
  );
} 