'use client';

import { useState } from 'react';
import AddItemModal from './AddItemModal';

interface AddLeagueButtonProps {
  noMargin?: boolean;
}

export default function AddLeagueButton({ noMargin = false }: AddLeagueButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)}
        className={`w-full flex items-center justify-center p-2.5 bg-white dark:bg-[#222222] hover:bg-gray-50 dark:hover:bg-[#333333] text-gray-900 dark:text-gray-100 rounded-lg transition-all duration-200 text-xs font-medium shadow-sm hover:shadow-md ${noMargin ? '' : 'mt-3'}`}
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

      <AddItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type="league"
      />
    </>
  );
} 