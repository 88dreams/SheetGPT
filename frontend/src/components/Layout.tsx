import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import '../styles/pageHeader.css'
import '../styles/pageContainer.css'

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {/* Add top padding to account for fixed navbar (h-16 = 64px) */}
      <main className="container mx-auto px-4 py-8 pt-20">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout 