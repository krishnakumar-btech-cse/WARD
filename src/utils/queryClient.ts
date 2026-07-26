import { QueryClient } from '@tanstack/react-query';
import { CatalystApiError } from './apiError';

/** Shared QueryClient instance — wrap the app in <QueryClientProvider client={queryClient}>. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof CatalystApiError && error.code === 'NOT_AUTHENTICATED') {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
