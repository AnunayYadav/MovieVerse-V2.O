import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes stale time
      gcTime: 1000 * 60 * 10,    // 10 minutes garbage collection time
      retry: 2,
      refetchOnWindowFocus: false, // Avoid network hits on TV D-pad focus transitions
    },
  },
});

export default queryClient;
