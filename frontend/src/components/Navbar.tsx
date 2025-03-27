import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface NavLinkProps {
  to: string
  label: string
  isActive: boolean
  className?: string
}

const NavLink: React.FC<NavLinkProps> = ({ to, label, isActive, className = '' }) => (
  <Link
    to={to}
    className={`px-3 py-2 rounded-md text-sm font-medium ${
      isActive ? 'text-blue-600' : 'text-gray-700'
    } hover:text-gray-900 ${className}`}
  >
    {label}
  </Link>
)

interface NavItem {
  path: string
  label: string
  title: string
  requiresAuth: boolean
}

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth()
  const location = useLocation()

  const navItems: NavItem[] = [
    { path: '/chat', label: 'Chat', title: 'Chat', requiresAuth: true },
    { path: '/sports', label: 'Entities', title: 'Entities', requiresAuth: true },
    { path: '/database', label: 'Query', title: 'Query', requiresAuth: true },
    { path: '/data', label: 'Export', title: 'Export', requiresAuth: true },
    { path: '/settings', label: 'Settings', title: 'Settings', requiresAuth: true },
    { path: '/help', label: 'Help', title: 'Documentation', requiresAuth: true },
    { path: '/login', label: 'Login', title: '', requiresAuth: false },
    { path: '/register', label: 'Register', title: '', requiresAuth: false },
  ]

  const getPageTitle = () => {
    const currentItem = navItems.find(item => item.path === location.pathname)
    return currentItem?.title || ''
  }

  const pageTitle = getPageTitle()

  return (
    <nav className="bg-white shadow fixed top-0 left-0 right-0 z-50">
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
                {navItems
                  .filter(item => item.requiresAuth)
                  .map(item => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      label={item.label}
                      isActive={location.pathname === item.path}
                    />
                  ))}
                <button
                  onClick={logout}
                  className="ml-4 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  label="Login"
                  isActive={location.pathname === '/login'}
                />
                <NavLink
                  to="/register"
                  label="Register"
                  isActive={location.pathname === '/register'}
                  className="ml-4"
                />
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
} 