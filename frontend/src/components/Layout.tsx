import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import DataFlowIndicator from './common/DataFlowIndicator'
import SmartBreadcrumbs from './common/SmartBreadcrumbs'
import '../styles/dataFlow.css'
import '../styles/breadcrumbs.css'
import '../styles/pageHeader.css'
import '../styles/pageContainer.css'

const Layout: React.FC = () => {
  const location = useLocation();
  
  // Only show flow indicator on main app pages
  const showFlowIndicator = 
    location.pathname.includes('/chat') || 
    location.pathname.includes('/data') || 
    location.pathname.includes('/sports') || 
    location.pathname.includes('/export');
    
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {showFlowIndicator && <DataFlowIndicator />}
        {showFlowIndicator && <SmartBreadcrumbs />}
        <Outlet />
      </main>
    </div>
  )
}

export default Layout 