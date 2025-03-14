"use client"

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface NavDropdownProps {
  label: string;
  items: Array<{
    href: string;
    text: string;
    subtext?: string;
  }>;
}

const NavDropdown = ({ label, items }: NavDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center text-sm font-medium text-white hover:text-gray-200 focus:outline-none whitespace-nowrap"
      >
        {label}
        <svg 
          className={`ml-1 h-5 w-5 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path 
            fillRule="evenodd" 
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" 
            clipRule="evenodd" 
          />
        </svg>
      </button>
      
      {isOpen && (
        <div 
          className="fixed mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5" 
          style={{ 
            left: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().left : 0,
            top: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().bottom + window.scrollY : 0,
            zIndex: 9999 
          }}
        >
          <div className="py-1">
            {items.map((item, index) => (
              <Link 
                key={index} 
                href={item.href} 
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsOpen(false)}
              >
                {item.subtext ? (
                  <div className="flex items-center justify-between">
                    <span>{item.text}</span>
                    <span className="text-xs text-gray-500">{item.subtext}</span>
                  </div>
                ) : (
                  item.text
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NavDropdown; 