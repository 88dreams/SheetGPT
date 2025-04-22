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
import DataManagement from './features/DataManagement'
import SportsDatabase from './pages/SportsDatabase'
import EntityDetail from './pages/EntityDetail'
import DatabaseQuery from './pages/DatabaseQuery'
import Settings from './pages/Settings'
import Documentation from './pages/Documentation'
import Contacts from './pages/Contacts'
import LoadingSpinner from './components/common/LoadingSpinner'
import { FaFlask } from 'react-icons/fa'
import SportDataMapper from './components/data/SportDataMapper'
import { DataExtractionService } from './services/DataExtractionService'
import { isTokenExpiredOrExpiringSoon, refreshAuthToken } from './utils/tokenRefresh'

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
  // Check token status and refresh if needed when the app loads
  useEffect(() => {
    const checkAndRefreshToken = async () => {
      if (isTokenExpiredOrExpiringSoon()) {
        console.log('Token expired or expiring soon on app load, refreshing...');
        try {
          await refreshAuthToken();
        } catch (error) {
          console.error('Failed to refresh token on app load:', error);
        }
      }
    };
    
    checkAndRefreshToken();
    
    // Set up a timer to periodically check token status
    const tokenCheckInterval = setInterval(() => {
      checkAndRefreshToken();
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    return () => {
      clearInterval(tokenCheckInterval);
    };
  }, []);

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
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
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
              <Route index element={<Navigate to="chat" />} />
              <Route path="chat" element={<Chat />} />
              <Route path="data" element={<DataManagement />} />
              {/* Add a redirect for any data/:id pattern to the main data page */}
              <Route path="data/:id" element={<Navigate to="data" replace />} />
              <Route path="sports" element={<SportsDatabase />} />
              <Route path="sports/:entityType/:id" element={<EntityDetail />} />
              <Route path="database" element={<DatabaseQuery />} />
              <Route path="contacts" element={<Contacts />} />
              <Route path="settings" element={<Settings />} />
              <Route path="help/*" element={<Documentation />} />
            </Route>
          </Routes>
        </ChatProvider>
      </DataFlowProvider>
    </NotificationProvider>
  )
}

export default App