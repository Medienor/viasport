'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, createContext, useContext } from 'react'

export const ApiCallContext = createContext({
  enableApiCalls: true,
  setEnableApiCalls: (value: boolean) => {}
})

export function useApiCallContext() {
  return useContext(ApiCallContext)
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }))

  const [enableApiCalls, setEnableApiCalls] = useState(true)
  
  // Disable API calls on certain pages
  if (typeof window !== 'undefined') {
    const EXCLUDED_PATHS = ['/kontakt', '/about', '/privacy-policy']
    const shouldEnableApiCalls = !EXCLUDED_PATHS.some(path => 
      window.location.pathname.startsWith(path)
    )
    
    if (enableApiCalls !== shouldEnableApiCalls) {
      setEnableApiCalls(shouldEnableApiCalls)
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ApiCallContext.Provider value={{ enableApiCalls, setEnableApiCalls }}>
        {children}
      </ApiCallContext.Provider>
    </QueryClientProvider>
  )
} 