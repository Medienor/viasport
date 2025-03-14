"use client"

import Link from 'next/link';
import { useState, useEffect } from 'react';

// Remove debugging log
// console.log("Footer module is being evaluated");

const Footer = () => {
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
    { name: 'Norge landskamper', id: '0' },
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
    <footer className="bg-[#061206] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Column 1: Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Fotball på TV</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              {norwegianTeams.map((team, index) => (
                <li key={index}>
                  <Link href={`/lag/${team.name.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-')}-${team.id}`} className="hover:text-white">
                    {team.name} kamper
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Column 2: More Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Internasjonale lag</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              {internationalTeams1.map((team, index) => (
                <li key={index}>
                  <Link href={`/lag/${team.name.toLowerCase().replace(/\s+/g, '-')}-${team.id}`} className="hover:text-white">
                    {team.name} kamper
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Column 3: More Teams */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Flere lag</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              {internationalTeams2.map((team, index) => (
                <li key={index}>
                  <Link href={`/lag/${team.name.toLowerCase().replace(/\s+/g, '-')}-${team.id}`} className="hover:text-white">
                    {team.name} kamper
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Column 4: Leagues and Championships */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Ligaer og mesterskap</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              {leaguesAndChampionships.map((league, index) => (
                <li key={index}>
                  <Link href={`/fotball/liga/${league.name.toLowerCase().replace(/\s+/g, '-').replace(/å/g, 'a').replace(/ø/g, 'o').replace(/æ/g, 'ae')}-${league.id}`} className="hover:text-white">
                    {league.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Column 5: About and Newsletter */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Om ViaSport</h3>
            <p className="text-gray-300 text-sm mb-4">
              ViaSport er din ultimate destinasjon for sportskalendere, kampinformasjon og lagstatistikk. 
              Følg favorittlagene dine og hold deg oppdatert på alle sportsbegivenheter.
            </p>
            <div className="flex space-x-4 mb-6">
              <a href="#" className="text-gray-300 hover:text-white">
                <span className="sr-only">Facebook</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-gray-300 hover:text-white">
                <span className="sr-only">Instagram</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-gray-300 hover:text-white">
                <span className="sr-only">Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
            </div>
            
            <h3 className="text-lg font-semibold mt-6 mb-4">Nyhetsbrev</h3>
            <form onSubmit={handleSubmit} className="mt-2">
              <div className="flex">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="min-w-0 flex-1 bg-white border border-gray-300 rounded-l-md py-2 px-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  placeholder="Din e-postadresse"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-green-800 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Abonner
                </button>
              </div>
            </form>
          </div>
        </div>
        
        {/* Image rights disclaimer */}
        <div className="border-t border-gray-800 mt-8 pt-6">
          <div className="text-xs text-gray-400 mb-6">
            <h4 className="font-medium mb-2">Bilderettigheter og logoer:</h4>
            <p>
              ViaSport bruker Fotball API for å vise bilder, logoer og annet medieinnhold. Vi eier ikke rettighetene til disse bildene. 
              Alle bilder og logoer tilhører deres respektive eiere og brukes kun for å identifisere offentlige ligaer, lag, spillere eller arenaer 
              i henhold til prinsippene om rimelig bruk. Noe innhold kan være opphavsrettsbeskyttet eller begrenset i enkelte land. 
              ViaSport tar ikke ansvar for uautorisert bruk av dette innholdet.
            </p>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-4 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-400">© {currentYear} ViaSport. Alle rettigheter reservert.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/om-oss" className="text-sm text-gray-400 hover:text-white">Om oss</Link>
              <Link href="/personvern" className="text-sm text-gray-400 hover:text-white">Personvern</Link>
              <Link href="/vilkar" className="text-sm text-gray-400 hover:text-white">Vilkår</Link>
              <Link href="/kontakt" className="text-sm text-gray-400 hover:text-white">Kontakt</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;