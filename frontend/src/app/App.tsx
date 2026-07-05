import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from 'react-router'
import { router } from '@/app/router/router'
import { Toaster } from '@/shared/components/ui/Toaster'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error) => {
        if ((error as { response?: { status?: number } })?.response?.status === 401) return false
        return failureCount < 2
      },
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
