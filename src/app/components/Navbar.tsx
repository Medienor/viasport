"use client"

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import SearchBar from './SearchBar';
import NavDropdown from './NavDropdown';
import Image from 'next/image';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isStickyVisible, setIsStickyVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const scrollThreshold = 50;

    const handleScroll = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        if (window.scrollY > scrollThreshold) {
          setIsStickyVisible(true);
        } else {
          setIsStickyVisible(false);
        }
      } else {
        setIsStickyVisible(false);
      }
    };

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
        setIsStickyVisible(false);
      } else {
        handleScroll();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const mainLeagues = [
    { name: 'Premier League', country: 'England', id: 39 },
    { name: 'Eliteserien', country: 'Norge', id: 103 },
    { name: 'Champions League', country: 'Europa', id: 2 },
    { name: 'La Liga', country: 'Spania', id: 140 },
    { name: 'Serie A', country: 'Italia', id: 135 },
  ];

  const additionalLeagues = [
    { name: 'Bundesliga', country: 'Tyskland', id: 78 },
    { name: 'Ligue 1', country: 'Frankrike', id: 61 },
    { name: 'Eredivisie', country: 'Nederland', id: 88 },
    { name: 'Primeira Liga', country: 'Portugal', id: 94 },
    { name: 'Europa League', country: 'Europa', id: 3 },
    { name: 'Conference League', country: 'Europa', id: 848 },
    { name: 'OBOS-ligaen', country: 'Norge', id: 104 },
    { name: 'Toppserien', country: 'Norge', id: 725 },
  ];

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

  const moreLeaguesItems = additionalLeagues.map(league => ({
    href: `/fotball/liga/${league.name.toLowerCase().replace(/\s+/g, '-')}-${league.id}`,
    text: league.name,
    subtext: league.country
  }));

  return (
    <>
      <nav className="bg-[#204028] text-white md:bg-[#204028]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:pl-8 lg:pr-0 bg-[#204028]">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="relative w-48 h-8">
                  <Image
                    src="/viasportlogo.svg"
                    alt="ViaSport"
                    fill
                    priority
                    className="object-contain"
                  />
                </Link>
              </div>
              
              <div className="ml-6 w-64 hidden md:block">
                <SearchBar />
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="hidden md:flex items-center">
                <button className="px-4 py-2 rounded-md text-sm font-medium border border-white/20 hover:bg-white/10 transition-colors duration-200 flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  <span>Logg inn</span>
                </button>
              </div>
              
              <div className="flex md:hidden ml-4">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-[#2a532f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#204028] focus:ring-white"
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
        
        <div className="hidden md:block bg-[#204028]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-12 overflow-x-auto hide-scrollbar">
              <div className="flex items-center space-x-4">
                <NavDropdown label="Kommende kamper" items={upcomingItems} />
                
                {mainLeagues.map((league, index) => (
                  <Link 
                    key={index} 
                    href={`/fotball/liga/${league.name.toLowerCase().replace(/\s+/g, '-')}-${league.id}`}
                    className="text-sm font-medium text-white hover:text-gray-200 whitespace-nowrap"
                  >
                    {league.name}
                  </Link>
                ))}
                
                <NavDropdown label="Flere ligaer" items={moreLeaguesItems} />

                <Link 
                  href="/fotball/live"
                  className="flex items-center text-sm font-medium text-white hover:text-gray-200 whitespace-nowrap"
                >
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                    Live nå
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        <style jsx global>{`
          .hide-scrollbar {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
          .hide-scrollbar::-webkit-scrollbar {
            display: none;  /* Chrome, Safari and Opera */
          }
        `}</style>
        
        <div
          className={`
            md:hidden ${/* Base: hide on medium screens and up */''}
            ${isMenuOpen ? 'block' : 'hidden'} ${/* Toggle visibility */''}
            ${
              isMenuOpen && isStickyVisible
                ? 'fixed top-12 left-0 right-0 z-30 bg-[#204028] h-[calc(100vh-3rem)] overflow-y-auto' // Style for sticky open state
                : '' // Default style (static positioning) when not sticky or closed
            }
          `}
        >
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
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
            
            <Link
              href="/fotball/live"
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium bg-[#2a532f] text-white mb-3"
            >
              <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
              Live nå
            </Link>
            
            <div className="mt-3">
              <div className="px-3 py-2 bg-[#204028] rounded-t-md font-medium text-white">
                Kommende kamper
              </div>
              <div className="bg-[#204028] rounded-b-md mb-2">
                {upcomingItems.map((item, index) => (
                  <Link
                    key={index}
                    href={item.href}
                    className="block px-3 py-2 text-sm font-medium hover:bg-[#204028] border-b border-[#204028] last:border-b-0"
                  >
                    {item.text}
                  </Link>
                ))}
              </div>
            </div>
            
            <div className="mt-3">
              <div className="px-3 py-2 bg-[#204028] rounded-t-md font-medium text-white">
                Populære ligaer
              </div>
              <div className="bg-[#204028] rounded-b-md mb-2">
                {mainLeagues.map((league, index) => (
                  <Link 
                    key={index} 
                    href={`/fotball/liga/${league.name.toLowerCase().replace(/\s+/g, '-')}-${league.id}`}
                    className="flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-[#204028] border-b border-[#204028] last:border-b-0"
                  >
                    <span>{league.name}</span>
                    <span className="text-xs text-green-200">{league.country}</span>
                  </Link>
                ))}
              </div>
            </div>
            
            <div className="mt-3">
              <div className="px-3 py-2 bg-[#204028] rounded-t-md font-medium text-white">
                Andre ligaer
              </div>
              <div className="bg-[#204028] rounded-b-md mb-2">
                {additionalLeagues.map((league, index) => (
                  <Link 
                    key={index} 
                    href={`/fotball/liga/${league.name.toLowerCase().replace(/\s+/g, '-')}-${league.id}`}
                    className="flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-[#204028] border-b border-[#204028] last:border-b-0"
                  >
                    <span>{league.name}</span>
                    <span className="text-xs text-green-200">{league.country}</span>
                  </Link>
                ))}
              </div>
            </div>
            
            <div className="mt-6">
              <button className="w-full flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium border border-white/20 hover:bg-white/10 transition-colors duration-200">
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                Logg inn
              </button>
            </div>
          </div>
        </div>
      </nav>

      {isStickyVisible && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-[#204028] text-white shadow-md md:hidden transition-transform duration-200 ease-in-out transform translate-y-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex justify-between items-center h-12">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="relative w-36 h-6">
                  <Image
                    src="/viasportlogo.svg"
                    alt="ViaSport"
                    fill
                    priority
                    className="object-contain"
                  />
                </Link>
              </div>
              <div className="flex">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="inline-flex items-center justify-center p-1 rounded-md text-white hover:bg-[#2a532f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#204028] focus:ring-white"
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
      )}
    </>
  );
};

export default Navbar; 