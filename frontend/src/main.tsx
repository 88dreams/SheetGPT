import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 15, // Data stays fresh for 15 minutes (increased from 5)
      gcTime: 1000 * 60 * 60, // Cache persists for 60 minutes (increased from 30)
      refetchOnMount: true,
      refetchOnWindowFocus: false, // Disable refetch on window focus to prevent data loss
      refetchOnReconnect: true,
      retry: 2, // Increase retry attempts
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000), // Exponential backoff
    },
    mutations: {
      retry: 2,
      retryDelay: 1000,
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
) 