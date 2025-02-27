import React, { useState, useEffect } from 'react';
import { FaDatabase, FaTrash, FaExclamationTriangle, FaUserShield } from 'react-icons/fa';
import { useNotification } from '../contexts/NotificationContext';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const Settings = () => {
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const [isCleaningDatabase, setIsCleaningDatabase] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleCleanDatabase = async () => {
    setIsCleaningDatabase(true);
    try {
      const response = await api.admin.cleanDatabase();
      showNotification('success', 'Database cleaned successfully');
      setShowConfirmation(false);
    } catch (error) {
      console.error('Error cleaning database:', error);
      showNotification('error', `Error cleaning database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCleaningDatabase(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      {user?.is_admin && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FaUserShield className="mr-2 text-purple-600" />
            Admin Settings
          </h2>
          <p className="text-gray-600 mb-4">
            These settings are only available to administrators.
          </p>
          
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FaDatabase className="mr-2 text-blue-600" />
              Master Database
            </h2>
            <p className="text-gray-600 mb-4">
              Manage your database settings and perform maintenance operations.
            </p>
            
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-medium mb-2">Database Maintenance</h3>
              
              <div className="bg-gray-50 p-4 rounded-md mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-1">
                    <FaExclamationTriangle className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Caution: Data Loss Warning</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        Cleaning the database will permanently delete all data. This action cannot be undone.
                        Make sure you have exported any important data before proceeding.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {!showConfirmation ? (
                <button
                  onClick={() => setShowConfirmation(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <FaTrash className="mr-2" />
                  Clean Database
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <FaExclamationTriangle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Are you absolutely sure?</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>This will permanently delete all data in your database. This action cannot be undone.</p>
                      </div>
                      <div className="mt-4 flex space-x-3">
                        <button
                          type="button"
                          onClick={handleCleanDatabase}
                          disabled={isCleaningDatabase}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          {isCleaningDatabase ? 'Cleaning...' : 'Yes, Clean Database'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowConfirmation(false)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {!user?.is_admin && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">User Settings</h2>
          <p className="text-gray-600 mb-4">
            Configure your personal settings and preferences.
          </p>
          <div className="text-gray-500 italic">
            No user settings available at this time.
          </div>
        </div>
      )}
      
      {/* Additional settings sections can be added here */}
    </div>
  );
};

export default Settings; 