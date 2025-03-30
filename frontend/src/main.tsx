import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

// Create a client with optimized settings for pagination
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Data stays fresh for 5 minutes to balance freshness and performance
      gcTime: 1000 * 60 * 30, // Cache persists for 30 minutes for garbage collection
      refetchOnMount: true,
      refetchOnWindowFocus: false, // Disable refetch on window focus to prevent data loss
      refetchOnReconnect: true,
      retry: 2, // Increase retry attempts
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000), // Exponential backoff
      structuralSharing: false, // Disable structural sharing for easier cache updates with pagination
      keepPreviousData: true, // Keep previous data while fetching new data for smooth pagination
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