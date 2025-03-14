"use client"

import { useEffect } from 'react';

interface ClientHeadProps {
  teamName: string;
}

export default function ClientHead({ teamName }: ClientHeadProps) {
  // Custom hook to update document title with the specific format
  useEffect(() => {
    // Format: {teamName} på TV & stream - Kampprogram, tabell og kanaler
    document.title = `${teamName} på TV & stream - Kampprogram, tabell og kanaler`;
  }, [teamName]);
  
  // This component doesn't render anything visible
  return null;
} 