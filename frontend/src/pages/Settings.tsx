import React, { useState, useEffect } from 'react';
import { 
  FaDatabase, 
  FaTrash, 
  FaExclamationTriangle, 
  FaUserShield, 
  FaArchive, 
  FaSave, 
  FaChartPie, 
  FaList, 
  FaSync,
  FaFileArchive
} from 'react-icons/fa';
import { useNotification } from '../contexts/NotificationContext';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const Settings = () => {
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const [isCleaningDatabase, setIsCleaningDatabase] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Database stats
  const [dbStats, setDbStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  
  // Backups
  const [backups, setBackups] = useState<any[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  
  useEffect(() => {
    if (user?.is_admin) {
      fetchDatabaseStats();
      fetchBackups();
    }
  }, [user]);
  
  const fetchDatabaseStats = async () => {
    if (!user?.is_admin) return;
    
    setIsLoadingStats(true);
    try {
      const stats = await api.dbManagement.getStatistics();
      setDbStats(stats);
    } catch (error) {
      console.error('Error fetching database stats:', error);
      showNotification('error', 'Failed to load database statistics');
    } finally {
      setIsLoadingStats(false);
    }
  };
  
  const fetchBackups = async () => {
    if (!user?.is_admin) return;
    
    setIsLoadingBackups(true);
    try {
      const backupsList = await api.dbManagement.listBackups();
      setBackups(backupsList);
    } catch (error) {
      console.error('Error fetching backups:', error);
      showNotification('error', 'Failed to load backup list');
    } finally {
      setIsLoadingBackups(false);
    }
  };
  
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const response = await api.dbManagement.createBackup();
      showNotification('success', response.message || 'Database backup created successfully');
      // Refresh the backup list
      await fetchBackups();
    } catch (error) {
      console.error('Error creating backup:', error);
      showNotification('error', `Error creating backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleCleanDatabase = async () => {
    setIsCleaningDatabase(true);
    try {
      const response = await api.admin.cleanDatabase();
      showNotification('success', 'Database cleaned successfully');
      setShowConfirmation(false);
      // Refresh stats after cleanup
      await fetchDatabaseStats();
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
      
      {/* User settings section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">User Settings</h2>
        <p className="text-gray-600 mb-4">
          Configure your personal settings and preferences.
        </p>
        
        {/* Archive Conversations Section (available to all users) */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h3 className="text-lg font-medium mb-2 flex items-center">
            <FaArchive className="mr-2 text-amber-600" />
            Conversation Management
          </h3>
          <p className="text-gray-600 mb-4">
            You can archive old conversations instead of deleting them. Archived conversations 
            can be restored later if needed.
          </p>
          <p className="text-sm text-gray-500 mb-3">
            To archive a conversation, go to the conversation list and use the Archive option 
            from the menu for the conversation you want to archive.
          </p>
        </div>
      </div>
      
      {/* Admin settings section */}
      {user?.is_admin && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FaUserShield className="mr-2 text-purple-600" />
            Admin Settings
          </h2>
          <p className="text-gray-600 mb-4">
            These settings are only available to administrators.
          </p>
          
          {/* Database Statistics Section */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FaChartPie className="mr-2 text-blue-600" />
              Database Statistics
              <button 
                onClick={fetchDatabaseStats} 
                disabled={isLoadingStats}
                className="ml-2 text-blue-500 hover:text-blue-700"
                title="Refresh statistics"
              >
                <FaSync className={`h-4 w-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
              </button>
            </h2>
            
            {isLoadingStats ? (
              <div className="text-center py-4">
                <div className="animate-pulse">Loading statistics...</div>
              </div>
            ) : dbStats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Users</h3>
                  <p className="text-2xl font-bold">{dbStats.user_count}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Conversations</h3>
                  <p className="text-2xl font-bold">{dbStats.conversation_count.total}</p>
                  <div className="text-sm mt-1">
                    <span className="text-green-600">{dbStats.conversation_count.active} active</span>
                    {" • "}
                    <span className="text-amber-600">{dbStats.conversation_count.archived} archived</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Messages</h3>
                  <p className="text-2xl font-bold">{dbStats.message_count}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    ~{dbStats.avg_messages_per_conversation} per conversation
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Storage</h3>
                  <p className="text-2xl font-bold">{dbStats.estimated_storage_mb.toFixed(2)} MB</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Estimated database size
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Structured Data</h3>
                  <p className="text-2xl font-bold">{dbStats.structured_data_count}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Data extractions
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Activity</h3>
                  <p className="text-2xl font-bold">
                    {dbStats.recent_activity ? 
                      dbStats.recent_activity[`last_7_days`] || 0 : 0}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Conversations in the last 7 days
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 italic">No statistics available</p>
            )}
          </div>
          
          {/* Database Backup Section */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FaSave className="mr-2 text-green-600" />
              Database Backups
              <button 
                onClick={fetchBackups} 
                disabled={isLoadingBackups}
                className="ml-2 text-blue-500 hover:text-blue-700"
                title="Refresh backup list"
              >
                <FaSync className={`h-4 w-4 ${isLoadingBackups ? 'animate-spin' : ''}`} />
              </button>
            </h2>
            
            <p className="text-gray-600 mb-4">
              Create and manage database backups to protect your data.
            </p>
            
            <div className="mb-4">
              <button
                onClick={handleCreateBackup}
                disabled={isCreatingBackup}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <FaSave className="mr-2" />
                {isCreatingBackup ? 'Creating Backup...' : 'Create New Backup'}
              </button>
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-md font-medium mb-3 flex items-center">
                <FaList className="mr-2 text-gray-600" />
                Available Backups
              </h3>
              
              {isLoadingBackups ? (
                <div className="text-center py-4">
                  <div className="animate-pulse">Loading backups...</div>
                </div>
              ) : backups.length > 0 ? (
                <div className="bg-gray-50 rounded-md">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filename</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {backups.map((backup, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{backup.filename}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(backup.created_at).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{backup.size_mb} MB</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 italic py-3">No backups available</p>
              )}
            </div>
          </div>
          
          {/* Database Maintenance Section */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FaDatabase className="mr-2 text-blue-600" />
              Database Maintenance
            </h2>
            <p className="text-gray-600 mb-4">
              Manage your database settings and perform maintenance operations.
            </p>
            
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-medium mb-2">Database Cleanup</h3>
              
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
    </div>
  );
};

export default Settings; 