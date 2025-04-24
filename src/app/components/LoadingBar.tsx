"use client"

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function LoadingBar() {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  return (
    <div
      className={`fixed top-0 left-0 right-0 h-[2px] bg-blue-500 transition-all duration-500 z-50 ${
        loading 
          ? 'opacity-100 translate-x-0' 
          : 'opacity-0 -translate-x-full'
      }`}
      style={{
        background: 'linear-gradient(to right, #3b82f6, #60a5fa)'
      }}
    />
  );
} 