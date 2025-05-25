"use client"

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import SearchBar from './SearchBar';
import Image from 'next/image';
import MegaMenu from './MegaMenu';
import { MagnifyingGlassIcon, XMarkIcon, Cog6ToothIcon, SunIcon, MoonIcon, ArrowRightOnRectangleIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

const Navbar = () => {
  const { session, isLoading, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isStickyVisible, setIsStickyVisible] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const pathname = usePathname();
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const megaMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);

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
    setIsSettingsOpen(false);
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(event.target as Node) &&
        settingsTriggerRef.current &&
        !settingsTriggerRef.current.contains(event.target as Node)
      ) {
        setIsSettingsOpen(false);
      }
    }

    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

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

  const handleSignInClick = () => {
    setIsSettingsOpen(false);
    setIsMenuOpen(false);
    router.push('/signin');
  };

  return (
    <>
      <nav className="bg-white dark:bg-dark-nav border-b border-gray-200 dark:border-dark-border z-20">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:pl-8 lg:pr-8 bg-white dark:bg-dark-nav">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="relative w-48 h-8">
                  <Image
                    src={theme === 'dark' ? "/whitelogo.svg" : "/blacklogo.svg"}
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
            </div>
            
            <div className="hidden md:flex items-center space-x-2">
              <button
                ref={megaMenuTriggerRef}
                onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 flex items-center ${
                  isMegaMenuOpen
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    : 'text-black dark:text-gray-100/80 hover:text-gray-700 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-transparent'
                }`}
                aria-haspopup="true"
                aria-expanded={isMegaMenuOpen}
              >
                Alle ligaer
                <svg className={`ml-1 h-4 w-4 transition-transform duration-200 ${isMegaMenuOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              <Link 
                href="/transfers"
                className="px-4 py-2 rounded-md text-sm font-semibold text-black dark:text-gray-100/80 hover:text-gray-700 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-transparent transition-all duration-200"
              >
                Overganger
              </Link>

              <Link 
                href="/news"
                className="px-4 py-2 rounded-md text-sm font-semibold text-black dark:text-gray-100/80 hover:text-gray-700 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-transparent transition-all duration-200"
              >
                Nyheter
              </Link>

              <Link 
                href="/om-oss"
                className="px-4 py-2 rounded-md text-sm font-semibold text-black dark:text-gray-100/80 hover:text-gray-700 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-transparent transition-all duration-200"
              >
                Om oss
              </Link>

              <div className="relative">
                <button
                  ref={settingsTriggerRef}
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`p-2 rounded-full transition-all duration-200 ${
                    isSettingsOpen
                      ? 'bg-gray-200 dark:bg-[#222222] text-black dark:text-white'
                      : 'text-black dark:text-gray-100/80 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#222222]'
                  }`}
                  aria-label="Innstillinger"
                  aria-haspopup="true"
                  aria-expanded={isSettingsOpen}
                >
                  {session ? <UserCircleIcon className="h-6 w-6" /> : <Cog6ToothIcon className="h-6 w-6" />}
                </button>

                {isSettingsOpen && (
                  <div
                    ref={settingsMenuRef}
                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-nav rounded-md shadow-lg ring-1 ring-black dark:ring-dark-border ring-opacity-5 focus:outline-none z-30"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="settings-menu-button"
                  >
                    <div className="py-1" role="none">
                      {isLoading ? (
                        <div className="text-gray-500 dark:text-gray-400 block w-full text-left px-4 py-2 text-sm">Laster...</div>
                      ) : session ? (
                        <>
                          <div className="px-4 pt-2 pb-1 text-sm text-gray-500 dark:text-gray-400 truncate" title={session.user.email}>
                            {session.user.email}
                          </div>
                          <button
                            onClick={async () => {
                              await signOut();
                              setIsSettingsOpen(false);
                            }}
                            className="text-red-600 dark:text-red-400 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#222222]"
                            role="menuitem"
                          >
                            Logg ut
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleSignInClick}
                          className="text-gray-700 dark:text-gray-200 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#222222]"
                          role="menuitem"
                        >
                          Logg inn / Registrer deg
                        </button>
                      )}

                      <div className="border-t border-gray-100 dark:border-dark-border my-1"></div>
                      <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">Tema</div>
                      <div className="flex justify-around items-center px-4 pb-2">
                        <button
                          onClick={toggleTheme}
                          disabled={theme === 'light'}
                          className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#222222] text-gray-700 dark:text-gray-300 ${theme === 'light' ? 'bg-gray-200 dark:bg-[#333333]' : ''}`}
                          aria-label="Lyst tema"
                        >
                          <SunIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={toggleTheme}
                          disabled={theme === 'dark'}
                          className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#222222] text-gray-700 dark:text-gray-300 ${theme === 'dark' ? 'bg-gray-200 dark:bg-[#333333]' : ''}`}
                          aria-label="Mørkt tema"
                        >
                          <MoonIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex md:hidden items-center ml-4 space-x-2">
              <button
                onClick={() => setIsMobileSearchOpen(true)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 focus:ring-gray-500 dark:focus:ring-gray-400"
                aria-label="Åpne søk"
              >
                <MagnifyingGlassIcon className="block h-6 w-6" aria-hidden="true" />
              </button>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 focus:ring-gray-500 dark:focus:ring-gray-400"
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
      </nav>

      {hasMounted && isStickyVisible && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-dark-nav text-gray-800 dark:text-gray-100 md:hidden transition-transform duration-200 ease-in-out transform translate-y-0 border-b border-gray-100 dark:border-dark-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex justify-between items-center h-12">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="relative w-36 h-6">
                  <Image
                    src={theme === 'dark' ? "/whitelogo.svg" : "/blacklogo.svg"}
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
                  className="inline-flex items-center justify-center p-1 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 focus:ring-gray-500 dark:focus:ring-gray-400"
                  aria-label="Åpne søk"
                >
                  <MagnifyingGlassIcon className="block h-6 w-6" aria-hidden="true" />
                </button>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="inline-flex items-center justify-center p-1 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 focus:ring-gray-500 dark:focus:ring-gray-400"
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
        <div className="fixed inset-0 z-50 bg-white dark:bg-dark-main md:hidden flex flex-col animate-fade-in">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border flex-shrink-0">
            <button
              onClick={() => setIsMobileSearchOpen(false)}
              className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
              aria-label="Lukk søk"
            >
              <XMarkIcon className="h-6 w-6" />
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
          md:hidden
          ${isMenuOpen ? 'block' : 'hidden'}
          ${
            isMenuOpen && isStickyVisible
              ? 'fixed top-12 left-0 right-0 z-30 bg-white dark:bg-gray-800 h-[calc(100vh-3rem)] overflow-y-auto border-t border-gray-100 dark:border-gray-700'
              : isMenuOpen ? 'bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700'
              : ''
          }
        `}
      >
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white dark:bg-gray-800">
          <div className="mt-3">
            <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-t-md font-medium text-gray-800 dark:text-gray-100">
              Kommende kamper
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-b-md mb-2">
              {upcomingItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className="block px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  {item.text}
                </Link>
              ))}
            </div>
          </div>
          
          <Link
            href="/transfers"
            className="block px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
          >
            Overganger
          </Link>
          
          <Link
            href="/news"
            className="block px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
          >
            Nyheter
          </Link>
          
          <div className="mt-3">
            <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-t-md font-medium text-gray-800 dark:text-gray-100">
              Populære ligaer
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-b-md mb-2">
              {mainLeagues.map((league, index) => (
                <Link 
                  key={index} 
                  href={`/fotball/liga/${league.name.toLowerCase().replace(/\s+/g, '-')}-${league.id}`}
                  className="flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <span>{league.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{league.country}</span>
                </Link>
              ))}
            </div>
          </div>
          
          <div className="mt-3">
            <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-t-md font-medium text-gray-800 dark:text-gray-100">
              Andre ligaer
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-b-md mb-2">
              {additionalLeagues.map((league, index) => (
                <Link 
                  key={index} 
                  href={`/fotball/liga/${league.name.toLowerCase().replace(/\s+/g, '-')}-${league.id}`}
                  className="flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <span>{league.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{league.country}</span>
                </Link>
              ))}
            </div>
          </div>
          
          <div className="mt-3">
            <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-t-md font-medium text-gray-800 dark:text-gray-100">
              Tema
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-b-md mb-2 flex justify-around items-center p-2">
               <button
                  onClick={toggleTheme}
                  disabled={theme === 'light'}
                  className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 ${theme === 'light' ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
                  aria-label="Lyst tema"
                >
                  <SunIcon className="h-6 w-6" />
                </button>
                <button
                  onClick={toggleTheme}
                  disabled={theme === 'dark'}
                  className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 ${theme === 'dark' ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
                  aria-label="Mørkt tema"
                >
                  <MoonIcon className="h-6 w-6" />
                </button>
            </div>
          </div>
          
          <div className="mt-6 px-2">
            {isLoading ? (
               <div className="w-full flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400">
                 Laster...
               </div>
            ) : session ? (
              <>
                <div className="px-3 pb-2 text-sm text-gray-500 dark:text-gray-400 truncate text-center" title={session.user.email}>
                  {session.user.email}
                </div>
                <button
                  onClick={async () => {
                    await signOut();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-800/40 transition-colors duration-200"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
                  Logg ut
                </button>
              </>
            ) : (
              <button
                onClick={handleSignInClick}
                className="w-full flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <UserCircleIcon className="h-5 w-5 mr-2" />
                Logg inn / Registrer deg
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar; 