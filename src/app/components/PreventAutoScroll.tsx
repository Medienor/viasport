"use client"

import { useEffect } from 'react';

export default function PreventAutoScroll() {
  useEffect(() => {
    // Scroll to top when the component mounts
    window.scrollTo(0, 0);
    
    // Remove any hash from the URL to prevent auto-scrolling
    if (window.location.hash) {
      window.history.replaceState(
        null, 
        document.title, 
        window.location.pathname + window.location.search
      );
    }
  }, []);
  
  return null;
} 