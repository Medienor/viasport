import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface APITrackingStore {
  totalRequests: number;
  requestsByEndpoint: Record<string, number>;
  incrementRequest: (endpoint: string) => void;
  resetTracking: () => void;
}

export const useAPITracking = create<APITrackingStore>()(
  persist(
    (set) => ({
      totalRequests: 0,
      requestsByEndpoint: {},
      incrementRequest: (endpoint: string) => set((state) => ({
        totalRequests: state.totalRequests + 1,
        requestsByEndpoint: {
          ...state.requestsByEndpoint,
          [endpoint]: (state.requestsByEndpoint[endpoint] || 0) + 1,
        },
      })),
      resetTracking: () => set({ totalRequests: 0, requestsByEndpoint: {} }),
    }),
    {
      name: 'api-tracking-storage',
      storage: createJSONStorage(() => {
        // Only use localStorage in browser environment
        if (typeof window !== 'undefined') {
          return window.localStorage;
        }
        // Provide fallback storage for SSR
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
    }
  )
); 