"use client"

import { useEffect } from 'react';

interface ClientHeadProps {
  title: string;
}

export default function ClientHead({ title }: ClientHeadProps) {
  // Custom hook to update document title
  useEffect(() => {
    document.title = title;
  }, [title]);
  
  // This component doesn't render anything visible
  return null;
} 