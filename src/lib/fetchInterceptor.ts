import { useAPITracking } from './stores/apiTracking';

// Store the original fetch function
const originalFetch = global.fetch;

// Create our interceptor
global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = input instanceof Request ? input.url : input.toString();
  
  // Check if this is a RapidAPI call
  if (url.includes('api-football-v1.p.rapidapi.com')) {
    try {
      // Extract the endpoint path from the URL
      const endpoint = new URL(url).pathname;
      
      // Increment the request counter
      useAPITracking.getState().incrementRequest(endpoint);
      
      console.log(`[API Tracker] Request to: ${endpoint}`);
    } catch (error) {
      console.error('[API Tracker] Error tracking request:', error);
    }
  }
  
  // Call the original fetch with all arguments
  return originalFetch(input, init);
};

export {}; 