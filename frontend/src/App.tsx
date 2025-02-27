import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { NotificationProvider } from './contexts/NotificationContext'
import { DataFlowProvider } from './contexts/DataFlowContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Chat from './pages/Chat'
import DataManagement from './pages/DataManagement'
import SportsDatabase from './pages/SportsDatabase'
import Export from './pages/Export'
import Settings from './pages/Settings'
import LoadingSpinner from './components/common/LoadingSpinner'
import { FaFlask } from 'react-icons/fa'
import SportDataMapper from './components/data/SportDataMapper'
import { DataExtractionService } from './services/DataExtractionService'

// Protected route wrapper component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isReady } = useAuth()
  const [showContent, setShowContent] = useState(false)

  // Use an effect to handle the transition
  useEffect(() => {
    if (isReady && isAuthenticated) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setShowContent(true)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setShowContent(false)
    }
  }, [isReady, isAuthenticated])

  // Always render a container to prevent remounting
  return (
    <div className="min-h-screen">
      {!isReady || isLoading ? (
        <div className="h-screen flex items-center justify-center">
          <LoadingSpinner size="large" />
        </div>
      ) : !isAuthenticated ? (
        <Navigate to="/login" replace />
      ) : showContent ? (
        children
      ) : (
        <div className="h-screen flex items-center justify-center">
          <LoadingSpinner size="large" />
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <NotificationProvider>
      <DataFlowProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Add nested routes here later */}
            <Route index element={<Navigate to="/chat" />} />
            <Route path="chat" element={<Chat />} />
            <Route path="data" element={<DataManagement />} />
            <Route path="sports" element={<SportsDatabase />} />
            <Route path="export" element={<Export />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </DataFlowProvider>
    </NotificationProvider>
  )
} 