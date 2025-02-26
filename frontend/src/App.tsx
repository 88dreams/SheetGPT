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
import LoadingSpinner from './components/common/LoadingSpinner'
import { FaFlask } from 'react-icons/fa'
import SportDataMapper from './components/data/SportDataMapper'

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
  // Add state for the test mapper
  const [showTestMapper, setShowTestMapper] = useState(false);
  const [testData, setTestData] = useState<any>(null);

  // Function to handle the test button click
  const handleTestButtonClick = () => {
    console.log('%c TEST BUTTON CLICKED FROM APP COMPONENT ', 'background: #ff0000; color: #ffffff; font-size: 20px;');
    
    // Create sample sports data for testing
    const sampleData = {
      headers: ['Team', 'City', 'State', 'Stadium', 'Founded'],
      rows: [
        ['Dallas Cowboys', 'Dallas', 'TX', 'AT&T Stadium', '1960'],
        ['New York Giants', 'East Rutherford', 'NJ', 'MetLife Stadium', '1925'],
        ['Philadelphia Eagles', 'Philadelphia', 'PA', 'Lincoln Financial Field', '1933'],
        ['Washington Commanders', 'Landover', 'MD', 'FedExField', '1932'],
        ['TEST TEAM', 'Test City', 'TS', 'Test Stadium', '2025'] // Added test team for visibility
      ],
      meta_data: {
        source: 'test-data',
        data_type: 'sports-data',
        extracted_at: new Date().toISOString(),
        test_flag: true // Added flag to identify test data
      }
    };
    
    console.log('Test: Sample data created', sampleData);
    setTestData(sampleData);
    setShowTestMapper(true);
    console.log('Test: SportDataMapper should now be visible');
    
    // Add an alert to make it very obvious
    alert('Test button clicked from App component! Check console for logs and watch for the SportDataMapper modal.');
  };

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
          </Route>
        </Routes>

        {/* Global Test Button - Always Visible */}
        <div 
          className="fixed bottom-4 right-4 z-50 bg-red-600 text-white p-3 rounded-full shadow-lg cursor-pointer hover:bg-red-700"
          onClick={handleTestButtonClick}
          style={{ border: '2px solid white' }}
        >
          <FaFlask size={24} />
        </div>

        {/* Test SportDataMapper Modal */}
        <SportDataMapper
          isOpen={showTestMapper}
          onClose={() => setShowTestMapper(false)}
          structuredData={testData}
        />
      </DataFlowProvider>
    </NotificationProvider>
  )
} 