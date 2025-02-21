import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { NotificationProvider } from './contexts/NotificationContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Chat from './pages/Chat'
import DataManagement from './pages/DataManagement'
import LoadingSpinner from './components/common/LoadingSpinner'

// Protected route wrapper component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <NotificationProvider>
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
        </Route>
      </Routes>
    </NotificationProvider>
  )
} 