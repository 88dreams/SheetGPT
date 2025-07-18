import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App'
import './index.css'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // default: true
      retry: 1, // Retry failed requests once
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

const isProduction = window.location.hostname.includes('88gpts.com');
const basePath = isProduction ? '/sheetgpt' : '/';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter basename={basePath}>
      <QueryClientProvider client={queryClient}>
        <ReactQueryDevtools initialIsOpen={false} />
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
) 