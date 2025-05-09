"use client"

import Link from 'next/link';
import { useState, useEffect } from 'react';
// Remove the unused import if 'useTheme' is no longer needed here
// import { useTheme } from '@/context/ThemeContext';

// Remove debugging log
// console.log("Footer module is being evaluated");

const Footer = () => {
  // const { theme } = useTheme(); // Remove this line - theme variable is not used
  const [email, setEmail] = useState('');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // Update the year when component mounts
  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter subscription
    console.log('Subscribed with email:', email);
    setEmail('');
    // Show success message or handle API call
  };
  
  // Define teams with their IDs
  const norwegianTeams = [
    { name: 'Norge landskamper', id: 'norway-1090', fullUrl: true },
    { name: 'Rosenborg', id: '331' },
    { name: 'Brann', id: '319' },
    { name: 'Molde', id: '329' },
    { name: 'Bodø/Glimt', id: '327' },
    { name: 'Odd', id: '330' },
    { name: 'Strømsgodset', id: '324' },
  ];
  
  const internationalTeams1 = [
    { name: 'Liverpool', id: '40' },
    { name: 'Manchester United', id: '33' },
    { name: 'Arsenal', id: '42' },
    { name: 'Manchester City', id: '50' },
    { name: 'Chelsea', id: '49' },
    { name: 'Tottenham', id: '47' },
    { name: 'Leicester', id: '46' },
    { name: 'Juventus', id: '496' },
    { name: 'Milan', id: '489' },
  ];
  
  const internationalTeams2 = [
    { name: 'Inter', id: '505' },
    { name: 'Roma', id: '497' },
    { name: 'Barcelona', id: '529' },
    { name: 'Real Madrid', id: '541' },
    { name: 'Atlético Madrid', id: '530' },
    { name: 'Real Sociedad', id: '548' },
    { name: 'Villarreal', id: '533' },
    { name: 'Sevilla', id: '536' },
  ];
  
  // Define leagues and championships with their IDs
  const leaguesAndChampionships = [
    { name: 'Premier League', id: '39' },
    { name: 'Eliteserien', id: '103' },
    { name: 'Champions League', id: '2' },
    { name: 'La Liga', id: '140' },
    { name: 'Serie A', id: '135' },
    { name: 'Bundesliga', id: '78' },
    { name: 'OBOS-ligaen', id: '104' },
    { name: 'Toppserien', id: '725' },
    { name: 'Eredivisie', id: '88' },
    { name: 'FA Cup', id: '45' },
    { name: 'Europa League', id: '3' },
    { name: 'Conference League', id: '848' },
  ];
  
  return (
    <footer className="bg-gray-100 dark:bg-dark-nav text-gray-800 dark:text-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Column 1: Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Fotball på TV</h3>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {norwegianTeams.map((team, index) => (
                <li key={index}>
                  <Link 
                    href={team.fullUrl 
                      ? `/lag/${team.id}` 
                      : `/lag/${team.name.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-')}-${team.id}`} 
                    className="hover:text-black dark:hover:text-white"
                  >
                    {team.name} kamper
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Column 2: More Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Internasjonale lag</h3>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {internationalTeams1.map((team, index) => (
                <li key={index}>
                  <Link href={`/lag/${team.name.toLowerCase().replace(/\s+/g, '-')}-${team.id}`} className="hover:text-black dark:hover:text-white">
                    {team.name} kamper
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Column 3: More Teams */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Flere lag</h3>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {internationalTeams2.map((team, index) => (
                <li key={index}>
                  <Link href={`/lag/${team.name.toLowerCase().replace(/\s+/g, '-')}-${team.id}`} className="hover:text-black dark:hover:text-white">
                    {team.name} kamper
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Column 4: Leagues and Championships */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Ligaer og mesterskap</h3>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {leaguesAndChampionships.map((league, index) => (
                <li key={index}>
                  <Link href={`/fotball/liga/${league.name.toLowerCase().replace(/\s+/g, '-').replace(/å/g, 'a').replace(/ø/g, 'o').replace(/æ/g, 'ae')}-${league.id}`} className="hover:text-black dark:hover:text-white">
                    {league.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Column 5: About and Newsletter */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Om ViaSport</h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
              ViaSport er din ultimate destinasjon for sportskalendere, kampinformasjon og lagstatistikk.
              Følg favorittlagene dine og hold deg oppdatert på alle sportsbegivenheter.
            </p>
            <div className="flex space-x-4 mb-6">
              {/* Removed Facebook icon */}
            </div>
          </div>
        </div>
        
        {/* Image rights disclaimer */}
        <div className="border-t border-gray-300 dark:border-dark-border mt-8 pt-6">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-6">
            <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-200">Bilderettigheter og logoer:</h4>
            <p>
              ViaSport bruker Fotball API for å vise bilder, logoer og annet medieinnhold. Vi eier ikke rettighetene til disse bildene. 
              Alle bilder og logoer tilhører deres respektive eiere og brukes kun for å identifisere offentlige ligaer, lag, spillere eller arenaer 
              i henhold til prinsippene om rimelig bruk. Noe innhold kan være opphavsrettsbeskyttet eller begrenset i enkelte land. 
              ViaSport tar ikke ansvar for uautorisert bruk av dette innholdet.
            </p>
          </div>
        </div>
        
        <div className="border-t border-gray-300 dark:border-dark-border mt-4 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">© {currentYear} ViaSport. Alle rettigheter reservert.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/om-oss" className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white">Om oss</Link>
              <Link href="/personvern" className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white">Personvern</Link>
              <Link href="/vilkar" className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white">Vilkår</Link>
              <Link href="/kontakt" className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white">Kontakt</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;