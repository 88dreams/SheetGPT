import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth()
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname === path ? 'text-blue-600' : 'text-gray-700'
  }

  const getPageTitle = () => {
    const path = location.pathname
    switch (path) {
      case '/chat':
        return 'Chat'
      case '/data':
        return 'Data Management'
      case '/sports':
        return 'Sports DB'
      case '/export':
        return 'Export'
      case '/settings':
        return 'Settings'
      default:
        return ''
    }
  }

  const pageTitle = getPageTitle()

  return (
    <nav className="bg-white shadow">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <span className="text-xl font-bold text-gray-800">
                SheetGPT{pageTitle && <span className="text-gray-500"> - {pageTitle}</span>}
              </span>
            </Link>
          </div>

          <div className="flex items-center">
            {isAuthenticated ? (
              <>
                <Link
                  to="/chat"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/chat')} hover:text-gray-900`}
                >
                  Chat
                </Link>
                <Link
                  to="/data"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/data')} hover:text-gray-900`}
                >
                  Data
                </Link>
                <Link
                  to="/sports"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/sports')} hover:text-gray-900`}
                >
                  Sports DB
                </Link>
                <Link
                  to="/export"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/export')} hover:text-gray-900`}
                >
                  Export
                </Link>
                <Link
                  to="/settings"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/settings')} hover:text-gray-900`}
                >
                  Settings
                </Link>
                <button
                  onClick={logout}
                  className="ml-4 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="ml-4 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
} 