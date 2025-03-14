"use client"

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRightIcon, HomeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { useParams } from 'next/navigation';

// Import from sportApi
import { BASE_URL, headers } from '@/app/services/sportApi';

// Define proper types for our data
interface Country {
  name: string;
  code: string | null;
  flag: string | null;
}

interface League {
  id: number;
  name: string;
  type: string;
  logo: string;
}

interface LeagueData {
  league: League;
  country: Country;
}

// Create a URL-friendly slug from a league name
function createLeagueSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[æøå]/g, match => {   // Handle Norwegian characters
      if (match === 'æ') return 'ae';
      if (match === 'ø') return 'o';
      if (match === 'å') return 'a';
      return match;
    })
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '')             // Trim hyphens from start
    .replace(/-+$/, '');            // Trim hyphens from end
}

export default function LeagueDirectoryPage() {
  // Get the sport parameter from the URL
  const params = useParams();
  const sport = typeof params.sport === 'string' ? params.sport : '';
  
  // Capitalize first letter of sport name
  const formattedSport = sport.charAt(0).toUpperCase() + sport.slice(1);
  
  const [leagues, setLeagues] = useState<LeagueData[]>([]);
  const [filteredLeagues, setFilteredLeagues] = useState<LeagueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [prefetchedDataLoaded, setPrefetchedDataLoaded] = useState(false);
  
  // Group leagues by country for display
  const leaguesByCountry = leagues.reduce<Record<string, LeagueData[]>>((acc, league) => {
    if (league && league.country && league.country.name) {
      const countryName = league.country.name;
      if (!acc[countryName]) {
        acc[countryName] = [];
      }
      acc[countryName].push(league);
    }
    return acc;
  }, {});
  
  // Define popular countries with Norwegian names and their English equivalents
  const popularCountries = [
    { en: 'Norway', no: 'Norge' },
    { en: 'England', no: 'England' },
    { en: 'Spain', no: 'Spania' },
    { en: 'Germany', no: 'Tyskland' },
    { en: 'Italy', no: 'Italia' },
    { en: 'France', no: 'Frankrike' }
  ];
  
  // Map for country translations (English to Norwegian)
  const countryTranslations: Record<string, string> = {
    'Norway': 'Norge',
    'England': 'England',
    'Spain': 'Spania',
    'Germany': 'Tyskland',
    'Italy': 'Italia',
    'France': 'Frankrike',
    'Netherlands': 'Nederland',
    'Portugal': 'Portugal',
    'Belgium': 'Belgia',
    'Sweden': 'Sverige',
    'Denmark': 'Danmark',
    'Scotland': 'Skottland',
    'Switzerland': 'Sveits',
    'Austria': 'Østerrike',
    'Greece': 'Hellas',
    'Turkey': 'Tyrkia',
    'Russia': 'Russland',
    'Ukraine': 'Ukraina',
    'Poland': 'Polen',
    'Croatia': 'Kroatia',
    'Czech Republic': 'Tsjekkia',
    'Romania': 'Romania',
    'Hungary': 'Ungarn',
    'Serbia': 'Serbia',
    'United States': 'USA',
    'Brazil': 'Brasil',
    'Argentina': 'Argentina',
    'Mexico': 'Mexico',
    'Japan': 'Japan',
    'South Korea': 'Sør-Korea',
    'China': 'Kina',
    'Australia': 'Australia',
    // Add more translations as needed
  };
  
  // Function to get Norwegian name for a country
  const getNorwegianName = (englishName: string): string => {
    return countryTranslations[englishName] || englishName;
  };
  
  // Filter countries for the dropdown (exclude popular ones)
  const otherCountries = Object.keys(leaguesByCountry)
    .filter(country => !popularCountries.some(pc => pc.en === country))
    .sort();
  
  // Get country flag from the first league of that country
  const getCountryFlag = (countryName: string): string | null => {
    if (leaguesByCountry[countryName] && leaguesByCountry[countryName][0]) {
      return leaguesByCountry[countryName][0].country.flag;
    }
    return null;
  };
  
  // Load pre-fetched data
  useEffect(() => {
    async function loadPrefetchedData() {
      try {
        // Dynamically import the pre-fetched data
        const { leaguesData, countriesData } = await import('@/app/data/leaguesData');
        
        console.log('Initial leaguesData from static file:', leaguesData.length > 0 ? 
          `Found data for ${leaguesData.length} leagues` : 
          'No pre-fetched leagues data found');

        console.log('Initial countriesData from static file:', countriesData.length > 0 ? 
          `Found data for ${countriesData.length} countries` : 
          'No pre-fetched countries data found');
        
        if (leaguesData.length > 0 && countriesData.length > 0) {
          console.log('Using pre-fetched leagues and countries data');
          setLeagues(leaguesData);
          setFilteredLeagues(leaguesData);
          
          // Set Norway as default selected country
          const norway = countriesData.find((country: any) => country.name === 'Norway');
          if (norway) {
            setSelectedCountry(norway.name);
          }
          
          setLoading(false);
          setPrefetchedDataLoaded(true);
        } else {
          setPrefetchedDataLoaded(false);
        }
      } catch (error) {
        console.error('Error loading pre-fetched data:', error);
        setPrefetchedDataLoaded(false);
      }
    }
    
    loadPrefetchedData();
  }, []);
  
  // Filter leagues based on selected country and search query
  useEffect(() => {
    let filtered = leagues;
    
    // Filter by country if selected
    if (selectedCountry) {
      filtered = filtered.filter((league) => 
        league && league.country && league.country.name === selectedCountry
      );
    }
    
    // Filter by search query if provided
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((league) => 
        league && league.league && league.country && 
        (league.league.name.toLowerCase().includes(query) ||
         league.country.name.toLowerCase().includes(query))
      );
    }
    
    setFilteredLeagues(filtered);
  }, [selectedCountry, searchQuery, leagues]);
  
  // Display error message if there is one
  useEffect(() => {
    if (error) {
      console.error('Error state:', error);
      // You could add UI notification here if needed
    }
  }, [error]);
  
  // Fetch data from API if pre-fetched data is not available
  useEffect(() => {
    async function fetchDataFromAPI() {
      // Only fetch from API if pre-fetched data wasn't loaded
      if (prefetchedDataLoaded) return;
      
      try {
        console.log('No pre-fetched data, fetching from API...');
        
        // Fetch countries from API
        const countriesResponse = await fetch(`${BASE_URL}/countries`, { headers });
        
        if (!countriesResponse.ok) {
          throw new Error(`API error: ${countriesResponse.status}`);
        }
        
        const countriesResult = await countriesResponse.json();
        const countriesData = countriesResult.response || [];
        
        // Sort countries alphabetically
        countriesData.sort((a: any, b: any) => a.name.localeCompare(b.name));
        
        setLeagues(countriesData);
        
        // Fetch leagues from API
        const leaguesResponse = await fetch(`${BASE_URL}/leagues`, { headers });
        
        if (!leaguesResponse.ok) {
          throw new Error(`API error: ${leaguesResponse.status}`);
        }
        
        const leaguesResult = await leaguesResponse.json();
        let leaguesData = leaguesResult.response || [];
        
        // Filter out leagues without proper data
        leaguesData = leaguesData.filter((league: any) => 
          league.league && 
          league.league.id && 
          league.league.name && 
          league.country && 
          league.country.name
        );
        
        // Sort leagues by country and then by name
        leaguesData.sort((a: any, b: any) => {
          if (a.country.name === b.country.name) {
            return a.league.name.localeCompare(b.league.name);
          }
          return a.country.name.localeCompare(b.country.name);
        });
        
        setLeagues(leaguesData);
        setFilteredLeagues(leaguesData);
        
        // Set Norway as default selected country
        const norway = countriesData.find((country: any) => country.name === 'Norway');
        if (norway) {
          setSelectedCountry(norway.name);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Det oppstod en feil ved henting av data. Vennligst prøv igjen senere.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchDataFromAPI();
  }, [prefetchedDataLoaded]);
  
  return (
    <>
      {/* Breadcrumb navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex py-3" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-1">
              <li>
                <Link href="/" className="text-sm text-gray-500 hover:text-blue-600">
                  <HomeIcon className="h-4 w-4" />
                </Link>
              </li>
              <li className="flex items-center">
                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                <Link href={`/${sport}`} className="ml-1 text-sm text-gray-500 hover:text-blue-600">
                  {formattedSport}
                </Link>
              </li>
              <li className="flex items-center">
                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                <span className="ml-1 text-sm text-gray-700">
                  Ligaer
                </span>
              </li>
            </ol>
          </nav>
        </div>
      </div>
      
      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">{formattedSport}-ligaer</h1>
        
        {/* Search and filter */}
        <div className="mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Søk etter liga..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Country filter - completely rebuilt */}
        {!loading && (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Filtrer etter land</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {/* "All countries" button */}
              <button
                className={`px-4 py-2 text-sm font-medium rounded-full ${
                  selectedCountry === '' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedCountry('')}
              >
                Alle land
              </button>
              
              {/* Popular countries as quick filters */}
              {popularCountries
                .filter(country => leaguesByCountry[country.en]) // Only show if country has leagues
                .map((country) => {
                  const flag = getCountryFlag(country.en);
                  return (
                    <button
                      key={country.en}
                      className={`px-4 py-2 text-sm font-medium rounded-full flex items-center ${
                        selectedCountry === country.en ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                      onClick={() => setSelectedCountry(country.en)}
                    >
                      {flag && (
                        <Image
                          src={flag}
                          alt={country.no}
                          width={16}
                          height={12}
                          className="mr-2"
                        />
                      )}
                      {country.no}
                    </button>
                  );
                })}
              
              {/* Dropdown for other countries */}
              {otherCountries.length > 0 && (
                <div className="relative inline-block text-left">
                  <div>
                    <button
                      type="button"
                      className="inline-flex justify-center w-full rounded-full border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                      id="country-menu-button"
                      aria-expanded="true"
                      aria-haspopup="true"
                      onClick={() => document.getElementById('country-dropdown')?.classList.toggle('hidden')}
                    >
                      Andre land
                      <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  
                  <div
                    id="country-dropdown"
                    className="hidden origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="country-menu-button"
                    tabIndex={-1}
                  >
                    <div className="py-1 max-h-60 overflow-y-auto" role="none">
                      {/* Search input for countries */}
                      <div className="px-3 py-2">
                        <input
                          type="text"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          placeholder="Søk etter land..."
                          onChange={(e) => {
                            const dropdown = document.getElementById('country-dropdown-list');
                            if (dropdown) {
                              const query = e.target.value.toLowerCase();
                              Array.from(dropdown.children).forEach((item) => {
                                const countryName = item.textContent?.toLowerCase() || '';
                                if (countryName.includes(query)) {
                                  item.classList.remove('hidden');
                                } else {
                                  item.classList.add('hidden');
                                }
                              });
                            }
                          }}
                        />
                      </div>
                      
                      {/* Country list */}
                      <div id="country-dropdown-list">
                        {otherCountries.map((country) => {
                          const flag = getCountryFlag(country);
                          return (
                            <button
                              key={country}
                              className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                              role="menuitem"
                              tabIndex={-1}
                              onClick={() => {
                                setSelectedCountry(country);
                                document.getElementById('country-dropdown')?.classList.add('hidden');
                              }}
                            >
                              {flag && (
                                <Image
                                  src={flag}
                                  alt={getNorwegianName(country)}
                                  width={16}
                                  height={12}
                                  className="mr-2"
                                />
                              )}
                              {getNorwegianName(country)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Show selected country as a tag if it's not one of the popular ones */}
            {selectedCountry && !popularCountries.some(pc => pc.en === selectedCountry) && (
              <div className="flex items-center mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {getCountryFlag(selectedCountry) && (
                    <Image
                      src={getCountryFlag(selectedCountry)!}
                      alt={getNorwegianName(selectedCountry)}
                      width={16}
                      height={12}
                      className="mr-2"
                    />
                  )}
                  {getNorwegianName(selectedCountry)}
                  <button
                    type="button"
                    className="ml-1 inline-flex text-blue-500 hover:text-blue-700"
                    onClick={() => setSelectedCountry('')}
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Leagues display - show filtered leagues */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div>
            {filteredLeagues.length > 0 ? (
              <div className="space-y-8">
                {Object.entries(
                  // Group filtered leagues by country
                  filteredLeagues.reduce<Record<string, LeagueData[]>>((acc, league) => {
                    if (league && league.country && league.country.name) {
                      const countryName = league.country.name;
                      if (!acc[countryName]) {
                        acc[countryName] = [];
                      }
                      acc[countryName].push(league);
                    }
                    return acc;
                  }, {})
                ).map(([country, countryLeagues]) => (
                  <div key={country}>
                    <div className="flex items-center mb-4">
                      {countryLeagues[0].country.flag && (
                        <Image
                          src={countryLeagues[0].country.flag}
                          alt={country}
                          width={24}
                          height={18}
                          className="mr-2"
                        />
                      )}
                      <h2 className="text-xl font-semibold">{getNorwegianName(country)}</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {countryLeagues.map((league) => (
                        <Link
                          key={league.league.id}
                          href={`/${sport}/liga/${createLeagueSlug(league.league.name)}-${league.league.id}`}
                          className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200"
                        >
                          <div className="p-4 flex items-center">
                            {league.league.logo && (
                              <div className="w-12 h-12 relative mr-3 flex-shrink-0">
                                <Image
                                  src={league.league.logo}
                                  alt={league.league.name}
                                  fill
                                  className="object-contain"
                                />
                              </div>
                            )}
                            <div>
                              <h3 className="font-medium text-gray-900">{league.league.name}</h3>
                              <p className="text-sm text-gray-500 capitalize">{league.league.type}</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg p-6 text-center">
                <p className="text-gray-500">Ingen ligaer funnet. Prøv et annet søk.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
} 