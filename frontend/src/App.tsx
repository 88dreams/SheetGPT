import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { NotificationProvider } from './contexts/NotificationContext'
import { DataFlowProvider } from './contexts/DataFlowContext'
import { ChatProvider } from './contexts/ChatContext'
import Layout from './components/Layout'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import Chat from './pages/Chat'
import DataManagement from './pages/DataManagement'
import SportsDatabase from './pages/SportsDatabase'
import EntityDetail from './pages/EntityDetail'
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

  useEffect(() => {
    if (isReady && isAuthenticated) {
      const timer = setTimeout(() => {
        setShowContent(true)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setShowContent(false)
    }
  }, [isReady, isAuthenticated])

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

const App: React.FC = () => {
  return (
    <NotificationProvider>
      <DataFlowProvider>
        <ChatProvider>
          <Routes>
            {/* Public routes with navbar */}
            <Route element={
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="pt-16">{/* Add padding for fixed navbar */}
                  <Outlet />
                </div>
              </div>
            }>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

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
              {/* Add a redirect for any data/:id pattern to the main data page */}
              <Route path="data/:id" element={<Navigate to="/data" replace />} />
              <Route path="sports" element={<SportsDatabase />} />
              <Route path="sports/:entityType/:id" element={<EntityDetail />} />
              <Route path="export" element={<Export />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </ChatProvider>
      </DataFlowProvider>
    </NotificationProvider>
  )
}

export default App 