'use client';

import { useState } from 'react';
import AddItemModal from './AddItemModal';

export default function AddItemButtons() {
  const [isLeagueModalOpen, setIsLeagueModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  return (
    <>
      {/* Add League Button */}
      <button 
        onClick={() => setIsLeagueModalOpen(true)}
        className="w-full mt-3 flex items-center justify-center p-2.5 bg-white dark:bg-[#222222] hover:bg-gray-50 dark:hover:bg-[#333333] text-gray-900 dark:text-gray-100 rounded-lg transition-all duration-200 text-xs font-medium shadow-sm hover:shadow-md"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-3.5 w-3.5 mr-2" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        LEGG TIL LIGA
      </button>

      {/* Add Team Button */}
      <button 
        onClick={() => setIsTeamModalOpen(true)}
        className="w-full mt-3 flex items-center justify-center p-2.5 bg-white dark:bg-[#222222] hover:bg-gray-50 dark:hover:bg-[#333333] text-gray-900 dark:text-gray-100 rounded-lg transition-all duration-200 text-xs font-medium shadow-sm hover:shadow-md"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-3.5 w-3.5 mr-2" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        LEGG TIL LAG
      </button>

      {/* Modals */}
      <AddItemModal
        isOpen={isLeagueModalOpen}
        onClose={() => setIsLeagueModalOpen(false)}
        type="league"
      />
      
      <AddItemModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        type="team"
      />
    </>
  );
} 