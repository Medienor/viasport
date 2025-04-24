import React, { forwardRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';

interface League {
  id: number;
  name: string;
  country: string;
  // logoUrl is no longer needed as we construct it dynamically
}

interface MegaMenuProps {
  isOpen: boolean;
  leagues: League[];
  onClose: () => void;
}

// Define animation classes
const initialAnimationClasses = "opacity-0 -translate-y-2.5"; // -10px approx
const finalAnimationClasses = "opacity-100 translate-y-0";

const MegaMenu = forwardRef<HTMLDivElement, MegaMenuProps>(({ isOpen, leagues, onClose }, ref) => {
  const [isMounted, setIsMounted] = useState(false);
  // State to control animation classes
  const [animationClasses, setAnimationClasses] = useState(initialAnimationClasses);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && isMounted) {
      // Start hidden when opening
      setAnimationClasses(initialAnimationClasses);
      // Use setTimeout to allow the initial state to render, then transition
      timer = setTimeout(() => {
        setAnimationClasses(finalAnimationClasses);
      }, 10); // Small delay (10ms)
    } else if (!isOpen) {
      // Reset to initial classes when closing (for next open)
      setAnimationClasses(initialAnimationClasses);
    }

    // Cleanup timeout on unmount or if isOpen changes before timeout fires
    return () => clearTimeout(timer);
  }, [isOpen, isMounted]);

  const getLeagueUrl = (league: League) => `/fotball/liga/${league.name.toLowerCase().replace(/\s+/g, '-')}-${league.id}`;

  // Function to get the dynamic logo URL
  const getLogoUrl = (leagueId: number) => `https://viasport.b-cdn.net/football/leagues/${leagueId}.png`;

  if (!isMounted || !isOpen) {
    return null;
  }

  return (
    <>
      {/* Overlay Portal (Fade in/out) */}
      {createPortal(
        <div
          // Add transition to overlay as well
          className={`fixed inset-0 bg-black/50 z-40 md:block hidden transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
          aria-hidden="true"
        />,
        document.body
      )}

      {/* Menu Content Portal */}
      {createPortal(
        <div
          ref={ref}
          // Apply base transition and dynamic animation classes
          className={`fixed top-16 left-0 right-0 z-50 md:block hidden transition-all duration-300 ease-in-out ${animationClasses}`}
          role="dialog"
          aria-modal="true"
        >
          {/* Inner div: Added rounded-lg for all corners */}
          <div className="max-w-7xl mx-auto bg-white shadow-lg border-t border-gray-100 rounded-lg">
            <div className="px-4 sm:px-6 lg:px-8 py-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">
                Populære Ligaer
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-4">
                {leagues.map((league) => (
                  <Link
                    key={league.id}
                    href={getLeagueUrl(league)}
                    onClick={onClose}
                    className="group flex items-center p-2 rounded-md hover:bg-gray-50 transition-colors duration-150"
                  >
                    {/* Logo */}
                    <div className="flex-shrink-0 h-8 w-8 mr-3 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden"> {/* Changed placeholder bg */}
                      <Image
                        // Use the dynamic URL function
                        src={getLogoUrl(league.id)}
                        alt={`${league.name} logo`}
                        width={24} // Keep size constraints
                        height={24}
                        className="object-contain"
                        // Optional: Add unoptimized prop if experiencing issues with external URLs in dev
                        // unoptimized
                        // Optional: Add error handling to show fallback
                        onError={(e) => {
                          // Simple fallback: hide the image, show initial
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling;
                          if (fallback) {
                            fallback.classList.remove('hidden');
                          }
                        }}
                      />
                      {/* Fallback text, initially hidden */}
                      <span className="text-xs font-medium text-gray-500 hidden">
                        {league.name.substring(0, 1)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800 group-hover:text-black">
                        {league.name}
                      </p>
                      <p className="text-xs text-gray-500">{league.country}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
});

MegaMenu.displayName = 'MegaMenu';

export default MegaMenu; 