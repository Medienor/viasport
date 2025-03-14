"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SearchBar from './SearchBar';
import NavDropdown from './NavDropdown';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close mobile menu when window is resized to desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isMenuOpen]);

  // Main football leagues to display in the navbar
  const mainLeagues = [
    { name: 'Premier League', country: 'England', id: 39 },
    { name: 'Eliteserien', country: 'Norge', id: 103 },
    { name: 'Champions League', country: 'Europa', id: 2 },
    { name: 'La Liga', country: 'Spania', id: 140 },
    { name: 'Serie A', country: 'Italia', id: 135 },
  ];

  // Additional football leagues for the dropdown
  const additionalLeagues = [
    { name: 'Bundesliga', country: 'Tyskland', id: 78 },
    { name: 'Ligue 1', country: 'Frankrike', id: 61 },
    { name: 'Eredivisie', country: 'Nederland', id: 88 },
    { name: 'Primeira Liga', country: 'Portugal', id: 94 },
    { name: 'Europa League', country: 'Europa', id: 3 },
    { name: 'Conference League', country: 'Europa', id: 848 },
    { name: 'OBOS-ligaen', country: 'Norge', id: 79 },
  ];

  // Upcoming matches dropdown items
  const upcomingItems = [
    { href: '/fotball/i-dag', text: 'I dag' },
    { href: '/fotball/i-morgen', text: 'I morgen' },
    { href: '/fotball/mandag', text: 'Mandag' },
    { href: '/fotball/tirsdag', text: 'Tirsdag' },
    { href: '/fotball/onsdag', text: 'Onsdag' },
    { href: '/fotball/torsdag', text: 'Torsdag' },
    { href: '/fotball/fredag', text: 'Fredag' },
    { href: '/fotball/lordag', text: 'Lørdag' },
    { href: '/fotball/sondag', text: 'Søndag' },
  ];

  // More leagues dropdown items
  const moreLeaguesItems = additionalLeagues.map(league => ({
    href: `/fotball/liga/${league.name.toLowerCase().replace(/\s+/g, '-')}-${league.id}`,
    text: league.name,
    subtext: league.country
  }));

  return (
    <nav className="bg-[#061206] text-white">
      {/* Top navigation bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:pl-8 lg:pr-0">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold">
                ViaSport
              </Link>
            </div>
            
            {/* Search - using the SearchBar component - hide on mobile */}
            <div className="ml-6 w-64 hidden md:block">
              <SearchBar />
            </div>
          </div>
          
          <div className="flex items-center">
            {/* User menu - hide some items on mobile */}
            <div className="flex items-center">
              <button className="bg-gradient-to-t from-[#061206] to-[#1e3a1e] px-4 py-2 rounded-md text-sm font-medium flex items-center hover:from-[#0a1e0a] hover:to-[#2a4a2a] transition-all duration-300">
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">Logg inn</span>
                <span className="sm:hidden">Inn</span>
              </button>
            </div>
            
            {/* Mobile menu button */}
            <div className="flex md:hidden ml-4">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="bg-[#142811] inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-green-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-800 focus:ring-white"
                aria-expanded={isMenuOpen}
              >
                <span className="sr-only">Åpne meny</span>
                {isMenuOpen ? (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Secondary navigation bar - only visible on desktop/tablet */}
      <div className="hidden md:block bg-[#142811]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12 overflow-x-auto hide-scrollbar">
            <div className="flex items-center space-x-4">
              {/* Kommende kamper dropdown */}
              <NavDropdown label="Kommende kamper" items={upcomingItems} />
              
              {/* Main leagues */}
              {mainLeagues.map((league, index) => (
                <Link 
                  key={index} 
                  href={`/fotball/liga/${league.name.toLowerCase().replace(/\s+/g, '-')}-${league.id}`}
                  className="text-sm font-medium text-white hover:text-gray-200 whitespace-nowrap"
                >
                  {league.name}
                </Link>
              ))}
              
              {/* More leagues dropdown */}
              <NavDropdown label="Flere ligaer" items={moreLeaguesItems} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Add custom styles to hide scrollbar but allow scrolling */}
      <style jsx global>{`
        .hide-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;  /* Chrome, Safari and Opera */
        }
      `}</style>
      
      {/* Mobile menu - improved layout */}
      <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'}`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-[#142811]">
          {/* Mobile search */}
          <div className="px-2 py-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-transparent rounded-md leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Søk"
              />
            </div>
          </div>
          
          {/* Collapsible sections for mobile */}
          <div className="mt-3">
            <div className="px-3 py-2 bg-[#061206] rounded-t-md font-medium text-white">
              Kommende kamper
            </div>
            <div className="bg-[#0a1e0a] rounded-b-md mb-2">
              {upcomingItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className="block px-3 py-2 text-sm font-medium hover:bg-[#142811] border-b border-[#061206] last:border-b-0"
                >
                  {item.text}
                </Link>
              ))}
            </div>
          </div>
          
          {/* Popular leagues section */}
          <div className="mt-3">
            <div className="px-3 py-2 bg-[#061206] rounded-t-md font-medium text-white">
              Populære ligaer
            </div>
            <div className="bg-[#0a1e0a] rounded-b-md mb-2">
              {mainLeagues.map((league, index) => (
                <Link 
                  key={index} 
                  href={`/fotball/liga/${league.name.toLowerCase().replace(/\s+/g, '-')}-${league.id}`}
                  className="flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-[#142811] border-b border-[#061206] last:border-b-0"
                >
                  <span>{league.name}</span>
                  <span className="text-xs text-green-200">{league.country}</span>
                </Link>
              ))}
            </div>
          </div>
          
          {/* Other leagues section */}
          <div className="mt-3">
            <div className="px-3 py-2 bg-[#061206] rounded-t-md font-medium text-white">
              Andre ligaer
            </div>
            <div className="bg-[#0a1e0a] rounded-b-md mb-2">
              {additionalLeagues.map((league, index) => (
                <Link 
                  key={index} 
                  href={`/fotball/liga/${league.name.toLowerCase().replace(/\s+/g, '-')}-${league.id}`}
                  className="flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-[#142811] border-b border-[#061206] last:border-b-0"
                >
                  <span>{league.name}</span>
                  <span className="text-xs text-green-200">{league.country}</span>
                </Link>
              ))}
            </div>
          </div>
          
          <div className="pt-4 pb-3 border-t border-[#061206]">
            <button className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-t from-[#061206] to-[#1e3a1e] hover:from-[#0a1e0a] hover:to-[#2a4a2a] transition-all duration-300">
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              Logg inn
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 