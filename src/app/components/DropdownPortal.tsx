"use client"

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

interface DropdownPortalProps {
  isOpen: boolean;
  children: React.ReactNode;
  anchorEl: HTMLElement | null;
  width?: number;
  onClose?: () => void;
}

const DropdownPortal = ({ isOpen, children, anchorEl, width, onClose }: DropdownPortalProps) => {
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  // Track if we're currently navigating
  const navigatingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle clicks outside the dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Only close if we're not currently navigating and the click is outside the dropdown
      if (
        !navigatingRef.current && 
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) && 
        onClose
      ) {
        onClose();
      }
    };

    // Handle link clicks inside the dropdown
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const linkElement = target.closest('a');
      
      if (linkElement && dropdownRef.current?.contains(linkElement)) {
        // Prevent the default link behavior
        e.preventDefault();
        
        // Get the href attribute
        const href = linkElement.getAttribute('href');
        
        if (href) {
          // Mark that we're navigating
          navigatingRef.current = true;
          
          // Navigate programmatically after a short delay
          setTimeout(() => {
            router.push(href);
            
            // Reset the navigating flag after navigation
            setTimeout(() => {
              navigatingRef.current = false;
              if (onClose) onClose();
            }, 100);
          }, 10);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('click', handleLinkClick, { capture: true });
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('click', handleLinkClick, { capture: true });
    };
  }, [isOpen, onClose, router]);

  if (!isOpen || !mounted || !anchorEl) return null;

  const rect = anchorEl.getBoundingClientRect();

  return createPortal(
    <div 
      ref={dropdownRef}
      className="fixed bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 overflow-hidden"
      style={{
        top: `${rect.bottom + window.scrollY}px`,
        left: `${rect.left + window.scrollX}px`,
        width: width ? `${width}px` : `${rect.width}px`,
        zIndex: 9999
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
};

export default DropdownPortal; 