"use client"

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Head from 'next/head';

// TEMPORARY API DISABLE FLAG - set to true to disable API calls
const DISABLE_API_CALLS = true;

// Define the League type if not imported
interface League {
  id: number;
  name: string;
  country: string;
  logo: string;
}

export default function SportLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams();
  const sport = typeof params.sport === 'string' ? params.sport : '';
  const [pageTitle, setPageTitle] = useState('ViaSport - Sportsendinger på TV og streaming');
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  
  // Capitalize first letter of sport name
  const formattedSport = sport.charAt(0).toUpperCase() + sport.slice(1);
  
  useEffect(() => {
    // Get current month and year in Norwegian
    const date = new Date();
    const month = date.toLocaleString('nb-NO', { month: 'long' });
    const year = date.getFullYear();
    const currentDate = `${month} ${year}`;
    
    // Set the document title directly
    const title = `${formattedSport} på TV stream - Kanal, TV-tider (${currentDate})`;
    document.title = title;
    setPageTitle(title);
  }, [formattedSport]);
  
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Skip API calls if disabled
        if (DISABLE_API_CALLS) {
          console.log(`[API DISABLED] SportLayoutClient would have fetched data for sport: ${sport}`);
          
          // Set mock data
          setLeagues([
            { id: 39, name: "Premier League", country: "England", logo: "https://media.api-sports.io/football/leagues/39.png" },
            { id: 140, name: "La Liga", country: "Spain", logo: "https://media.api-sports.io/football/leagues/140.png" },
            { id: 78, name: "Bundesliga", country: "Germany", logo: "https://media.api-sports.io/football/leagues/78.png" },
            { id: 135, name: "Serie A", country: "Italy", logo: "https://media.api-sports.io/football/leagues/135.png" },
            { id: 61, name: "Ligue 1", country: "France", logo: "https://media.api-sports.io/football/leagues/61.png" },
            { id: 2, name: "Champions League", country: "Europe", logo: "https://media.api-sports.io/football/leagues/2.png" }
          ]);
          
          setCountries([
            "England", "Spain", "Germany", "Italy", "France", "Europe", "Norway", "Sweden", "Denmark"
          ]);
          
          setLoading(false);
          return;
        }
        
        // Only fetch data for football for now
        if (sport.toLowerCase() === 'fotball') {
          // Get all available countries
          const countriesData = await getAvailableCountries();
          setCountries(countriesData);
          
          // Get all leagues (not just popular ones)
          if (selectedCountry) {
            const leaguesData = await getLeaguesByCountry(selectedCountry);
            setLeagues(leaguesData);
          } else {
            // If no country selected, get popular leagues
            const leaguesData = await getPopularLeagues();
            setLeagues(leaguesData);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Det oppstod en feil ved henting av data. Vennligst prøv igjen senere.');
        setLoading(false);
      }
    }
    
    fetchData();
  }, [sport, selectedCountry]);
  
  const description = `Finn ut når og hvor du kan se ${formattedSport.toLowerCase()} på TV og streaming. Kampoppsett, kanaler og tidspunkter for direktesendinger.`;
  
  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={description} />
      </Head>
      <main>
        {children}
      </main>
    </>
  );
} 