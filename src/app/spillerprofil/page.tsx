import { Metadata } from 'next';
import PlayerSearch from './PlayerSearch';

export const metadata: Metadata = {
  title: 'Søk etter spillere - ViaSport',
  description: 'Søk etter fotballspillere og se detaljerte spillerprofiler med statistikk og karrierehistorikk.',
};

export default function PlayerSearchPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6">Spillerprofiler</h1>
      <PlayerSearch />
    </div>
  );
} 