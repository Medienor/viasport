"use client"

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import SearchBar from './SearchBar';
import Image from 'next/image';
import MegaMenu from './MegaMenu';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isStickyVisible, setIsStickyVisible] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const pathname = usePathname();
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const megaMenuTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;

    const scrollThreshold = 50;

    const handleScroll = () => {
      const isMobile = window.innerWidth < 768;
      if (hasMounted && isMobile) {
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
      if (!hasMounted) return;
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
    handleResize();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [hasMounted]);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsMegaMenuOpen(false);
    setIsMobileSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        megaMenuRef.current &&
        !megaMenuRef.current.contains(event.target as Node) &&
        megaMenuTriggerRef.current &&
        !megaMenuTriggerRef.current.contains(event.target as Node)
      ) {
        setIsMegaMenuOpen(false);
      }
    }

    if (isMegaMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMegaMenuOpen]);

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

  const allLeagues = [...mainLeagues, ...additionalLeagues];

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

  return (
    <>
      <nav className="bg-white text-gray-800 border-t-2 border-t-[#2e2e2e] border-b border-gray-100 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:pl-8 lg:pr-0 bg-white">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="relative w-48 h-8">
                  <Image
                    src="/blacklogo.svg"
                    alt="ViaSport"
                    fill
                    priority
                    className="object-contain transition-opacity duration-200 hover:opacity-70"
                  />
                </Link>
              </div>
              
              <div className="ml-6 w-96 hidden md:block">
                <SearchBar />
              </div>

              <div className="hidden md:block ml-4">
                <button
                  ref={megaMenuTriggerRef}
                  onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center ${
                    isMegaMenuOpen
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-700 hover:text-black hover:bg-gray-50'
                  }`}
                  aria-haspopup="true"
                  aria-expanded={isMegaMenuOpen}
                >
                  Alle ligaer
                  <svg className={`ml-1 h-4 w-4 transition-transform duration-200 ${isMegaMenuOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="hidden md:flex items-center">
                <button className="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  <span>Logg inn</span>
                </button>
              </div>
              
              <div className="flex md:hidden items-center ml-4 space-x-2">
                <button
                  onClick={() => setIsMobileSearchOpen(true)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-500"
                  aria-label="Åpne søk"
                >
                  <MagnifyingGlassIcon className="block h-6 w-6" aria-hidden="true" />
                </button>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-500"
                  aria-expanded={isMenuOpen}
                  aria-controls="mobile-menu"
                >
                  <span className="sr-only">Åpne meny</span>
                  {isMenuOpen ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
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
        
        <div className="hidden md:block border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-0">
            {/* Removed the inner flex container and its contents */}
            {/* The links "Kommende kamper", main leagues, and "Flere ligaer" were here */}
          </div>
        </div>
      </nav>

      {hasMounted && isStickyVisible && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-white text-gray-800 md:hidden transition-transform duration-200 ease-in-out transform translate-y-0 border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex justify-between items-center h-12">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="relative w-36 h-6">
                  <Image
                    src="/blacklogo.svg"
                    alt="ViaSport"
                    fill
                    priority
                    className="object-contain transition-opacity duration-200 hover:opacity-70"
                  />
                </Link>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsMobileSearchOpen(true)}
                  className="inline-flex items-center justify-center p-1 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-500"
                  aria-label="Åpne søk"
                >
                  <MagnifyingGlassIcon className="block h-6 w-6" aria-hidden="true" />
                </button>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="inline-flex items-center justify-center p-1 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-500"
                  aria-expanded={isMenuOpen}
                  aria-controls="mobile-menu"
                >
                  <span className="sr-only">Åpne meny</span>
                  {isMenuOpen ? (
                     <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
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

      <MegaMenu
        ref={megaMenuRef}
        isOpen={isMegaMenuOpen}
        leagues={allLeagues}
        onClose={() => setIsMegaMenuOpen(false)}
      />

      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-white md:hidden flex flex-col animate-fade-in">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <button
              onClick={() => setIsMobileSearchOpen(false)}
              className="p-1 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
              aria-label="Lukk søk"
            >
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
            <div className="w-6"></div>
          </div>

          <div className="p-4 flex-shrink-0">
             <SearchBar
              onSearchResultClick={() => setIsMobileSearchOpen(false)}
              mobileMode={true}
            />
          </div>
        </div>
      )}

      <style jsx global>{`
        /* Scrollbar hiding styles */
        .hide-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;  /* Chrome, Safari and Opera */
        }

        /* Fade-in animation styles */
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>

      <div
        id="mobile-menu"
        className={`
          md:hidden ${/* Base: hide on medium screens and up */''}
          ${isMenuOpen ? 'block' : 'hidden'} ${/* Toggle visibility */''}
          ${
            isMenuOpen && isStickyVisible
              ? 'fixed top-12 left-0 right-0 z-30 bg-white h-[calc(100vh-3rem)] overflow-y-auto border-t border-gray-100' // Style for sticky open state
              : isMenuOpen ? 'bg-white border-t border-gray-100' // Style for non-sticky open state
              : '' // Default style (static positioning) when not sticky or closed
          }
        `}
      >
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white">
          <div className="mt-3">
            <div className="px-3 py-2 bg-gray-100 rounded-t-md font-medium text-gray-800">
              Kommende kamper
            </div>
            <div className="bg-white rounded-b-md mb-2">
              {upcomingItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                >
                  {item.text}
                </Link>
              ))}
            </div>
          </div>
          
          <div className="mt-3">
            <div className="px-3 py-2 bg-gray-100 rounded-t-md font-medium text-gray-800">
              Populære ligaer
            </div>
            <div className="bg-white rounded-b-md mb-2">
              {mainLeagues.map((league, index) => (
                <Link 
                  key={index} 
                  href={`/fotball/liga/${league.name.toLowerCase().replace(/\s+/g, '-')}-${league.id}`}
                  className="flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                >
                  <span>{league.name}</span>
                  <span className="text-xs text-gray-500">{league.country}</span>
                </Link>
              ))}
            </div>
          </div>
          
          <div className="mt-3">
            <div className="px-3 py-2 bg-gray-100 rounded-t-md font-medium text-gray-800">
              Andre ligaer
            </div>
            <div className="bg-white rounded-b-md mb-2">
              {additionalLeagues.map((league, index) => (
                <Link 
                  key={index} 
                  href={`/fotball/liga/${league.name.toLowerCase().replace(/\s+/g, '-')}-${league.id}`}
                  className="flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                >
                  <span>{league.name}</span>
                  <span className="text-xs text-gray-500">{league.country}</span>
                </Link>
              ))}
            </div>
          </div>
          
          <div className="mt-6 px-2">
            <button className="w-full flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors duration-200">
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              Logg inn
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar; 