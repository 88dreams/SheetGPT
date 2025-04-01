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
  FaFileArchive,
  FaBroom,
  FaMagic,
  FaSearch,
  FaWrench,
  FaCheck,
  FaClock,
  FaLock
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
  
  // Database maintenance
  const [maintenanceStatus, setMaintenanceStatus] = useState<any>(null);
  const [isLoadingMaintenanceStatus, setIsLoadingMaintenanceStatus] = useState(false);
  const [dryRunResults, setDryRunResults] = useState<any>(null);
  const [isRunningDryRun, setIsRunningDryRun] = useState(false);
  const [isRunningCleanup, setIsRunningCleanup] = useState(false);
  const [isRunningVacuum, setIsRunningVacuum] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [showCleanupConfirmation, setShowCleanupConfirmation] = useState(false);
  const [showVacuumConfirmation, setShowVacuumConfirmation] = useState(false);
  const [skipReindex, setSkipReindex] = useState(false);
  
  // Track if a step was just completed
  const [stepJustCompleted, setStepJustCompleted] = useState<number | null>(null);
  
  useEffect(() => {
    if (user?.is_admin) {
      fetchDatabaseStats();
      fetchBackups();
      fetchMaintenanceStatus();
    }
  }, [user]);
  
  // Effect to handle step completion
  useEffect(() => {
    if (stepJustCompleted !== null) {
      console.log(`Step ${stepJustCompleted} just completed, updating activeStep`);
      setActiveStep(stepJustCompleted + 1); // Move to next step
      setStepJustCompleted(null); // Reset for next use
    }
  }, [stepJustCompleted]);
  
  // State for warning modals for each step
  const [showStepWarning, setShowStepWarning] = useState<number | null>(null);
  
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
      // First create a backup on the server
      const response = await api.dbManagement.createBackup();
      
      if (response.success) {
        // Prompt the user to download the backup
        const downloadResponse = await api.dbManagement.downloadBackup(response.backup_id);
        
        // Create a download link
        const blob = new Blob([downloadResponse], { type: 'application/octet-stream' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = response.filename || 'database_backup.sql';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        
        showNotification('success', 'Database backup created and downloaded successfully');
      } else {
        showNotification('error', response.message || 'Failed to create backup');
      }
      
      // Refresh the backup list and maintenance status
      await Promise.all([
        fetchBackups(),
        fetchMaintenanceStatus()
      ]);
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

  // Database maintenance functions
  const fetchMaintenanceStatus = async () => {
    if (!user?.is_admin) return;
    
    setIsLoadingMaintenanceStatus(true);
    try {
      const status = await api.admin.getMaintenanceStatus();
      console.log('Maintenance status:', status);
      setMaintenanceStatus(status);
      
      // Track completion status for logging purposes only
      // This doesn't affect UI availability since all steps are now selectable
      let completedStep = 0;
      
      if (status.backup_exists && status.dry_run_completed && status.cleanup_completed) {
        completedStep = 3; // All steps completed up to Vacuum step
      } else if (status.backup_exists && status.dry_run_completed) {
        completedStep = 2; // Completed up to Cleanup step
      } else if (status.backup_exists) {
        completedStep = 1; // Completed Backup step
      } else {
        completedStep = 0; // No steps completed
      }
      
      console.log('Completed steps up to:', completedStep);
      
      // For backward compatibility: still track active step for any component that might depend on it
      // but this no longer controls button availability
      if (completedStep >= activeStep) {
        console.log('Updating active step to match completed step:', completedStep);
        setActiveStep(completedStep);
      }
    } catch (error) {
      console.error('Error fetching maintenance status:', error);
      showNotification('error', 'Failed to load maintenance status');
    } finally {
      setIsLoadingMaintenanceStatus(false);
    }
  };
  
  const handleRunDryRun = async () => {
    setIsRunningDryRun(true);
    try {
      const results = await api.admin.cleanupDryRun();
      console.log('Dry run results:', results);
      setDryRunResults(results);
      showNotification('success', 'Dry run completed successfully');
      
      // Trigger step completion via state
      if (results.success) {
        console.log('Setting step 1 as completed');
        setStepJustCompleted(1); // This will cause the effect to set activeStep to 2
      }
      
      // Update maintenance status
      await fetchMaintenanceStatus();
      
      console.log('Maintenance status after dry run:', await api.admin.getMaintenanceStatus());
    } catch (error) {
      console.error('Error running cleanup dry run:', error);
      showNotification('error', `Error running dry run: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunningDryRun(false);
    }
  };
  
  const handleRunCleanup = async () => {
    setIsRunningCleanup(true);
    
    try {
      // Trigger step completion immediately
      console.log('Setting step 2 as completed');
      setStepJustCompleted(2); // This will cause the effect to set activeStep to 3
      
      const results = await api.admin.runCleanup();
      console.log('Cleanup results:', results);
      
      // Check if the operation was skipped or had an error
      if (results.skipped) {
        showNotification('warning', 'Database cleanup was skipped');
      } else {
        showNotification('success', 'Database cleanup completed successfully');
        
        // Always mark cleanup as completed locally, regardless of backend status
        setMaintenanceStatus(prevStatus => ({
          ...prevStatus,
          cleanup_completed: true,
          cleanup_time: new Date().toISOString()
        }));
      }
      
      setShowCleanupConfirmation(false);
      
      // Update backend status and stats for consistency
      await Promise.all([
        fetchMaintenanceStatus(),
        fetchDatabaseStats()
      ]);
      
    } catch (error) {
      console.error('Error running database cleanup:', error);
      showNotification('error', `Error running cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Even on error, step 4 should still be available
      // This matches the overall maintenance workflow UI/UX pattern
      console.log('Ensuring step 4 is available even after error');
      
      // Force cleanup status to be completed locally
      setMaintenanceStatus(prevStatus => ({
        ...prevStatus,
        cleanup_completed: true
      }));
      
    } finally {
      setIsRunningCleanup(false);
    }
  };
  
  const handleRunVacuum = async () => {
    setIsRunningVacuum(true);
    try {
      const results = await api.admin.runVacuum({ skipReindex });
      console.log('Vacuum results:', results);
      showNotification('success', 'Database optimization completed successfully');
      setShowVacuumConfirmation(false);
      
      // Update maintenance status and stats
      await Promise.all([
        fetchMaintenanceStatus(),
        fetchDatabaseStats()
      ]);
      
      console.log('Maintenance status after vacuum:', await api.admin.getMaintenanceStatus());
    } catch (error) {
      console.error('Error running database vacuum:', error);
      showNotification('error', `Error running optimization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunningVacuum(false);
    }
  };

  // Debug log for the component render
  console.log('Rendering Settings with activeStep:', activeStep);
  
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
                  <p className="text-2xl font-bold">{dbStats.user_count || 0}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Conversations</h3>
                  <p className="text-2xl font-bold">{dbStats.conversation_count?.total || 0}</p>
                  <div className="text-sm mt-1">
                    <span className="text-green-600">{dbStats.conversation_count?.active || 0} active</span>
                    {" • "}
                    <span className="text-amber-600">{dbStats.conversation_count?.archived || 0} archived</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Messages</h3>
                  <p className="text-2xl font-bold">{dbStats.message_count || 0}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    ~{dbStats.avg_messages_per_conversation || 0} per conversation
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Storage</h3>
                  <p className="text-2xl font-bold">
                    {typeof dbStats.estimated_storage_mb === 'number' 
                      ? dbStats.estimated_storage_mb.toFixed(2) 
                      : (dbStats.estimated_storage_mb || 0)} MB
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Estimated database size
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Structured Data</h3>
                  <p className="text-2xl font-bold">{dbStats.structured_data_count || 0}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Data extractions
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Activity</h3>
                  <p className="text-2xl font-bold">
                    {dbStats.recent_activity && dbStats.recent_activity.last_7_days !== undefined
                      ? dbStats.recent_activity.last_7_days 
                      : 0}
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
                {isCreatingBackup ? 'Creating Backup...' : 'Create & Download Backup'}
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
              <button 
                onClick={fetchMaintenanceStatus} 
                disabled={isLoadingMaintenanceStatus}
                className="ml-2 text-blue-500 hover:text-blue-700"
                title="Refresh maintenance status"
              >
                <FaSync className={`h-4 w-4 ${isLoadingMaintenanceStatus ? 'animate-spin' : ''}`} />
              </button>
            </h2>
            <p className="text-gray-600 mb-4">
              Perform database maintenance tasks in a guided, step-by-step process. These operations help eliminate duplicate records,
              repair data integrity issues, and optimize database performance.
            </p>
            
            {/* Maintenance Steps */}
            <div className="mb-6 bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-4">Maintenance Workflow</h3>
              
              <div className="mb-8">
                <div className="relative">
                  {/* Step line */}
                  <div className="absolute left-6 top-0 h-full w-1 bg-gray-200" aria-hidden="true"></div>
                  
                  {/* Step 1: Create Backup */}
                  <div className="relative pb-8">
                    <div className="relative flex items-start">
                      <div className="h-12 w-12 rounded-full flex items-center justify-center bg-blue-600 z-10">
                        {maintenanceStatus?.backup_exists ? (
                          <FaCheck className="text-white h-6 w-6" />
                        ) : (
                          <span className="text-white font-medium">1</span>
                        )}
                      </div>
                      <div className="ml-4 min-w-0 flex-1">
                        <h4 className="text-base font-medium text-gray-900">Create Database Backup</h4>
                        <p className="text-sm text-gray-500">
                          Always start with a backup to ensure you can recover if needed.
                        </p>
                        <div className="mt-2">
                          {maintenanceStatus?.backup_exists ? (
                            <div>
                              <div className="text-green-600 flex items-center">
                                <FaCheck className="mr-1" />
                                <span>Backup created at {new Date(maintenanceStatus.last_backup_time).toLocaleString()}</span>
                              </div>
                              <button
                                onClick={handleCreateBackup}
                                disabled={isCreatingBackup}
                                className="mt-2 inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                <FaSave className="mr-1 h-3 w-3" />
                                {isCreatingBackup ? 'Creating...' : 'Create New Backup'}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={handleCreateBackup}
                              disabled={isCreatingBackup || activeStep !== 0}
                              className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white 
                                ${activeStep === 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'} 
                                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                            >
                              <FaSave className="mr-2" />
                              {isCreatingBackup ? 'Creating Backup...' : 'Create & Download Backup'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Step 2: Run Cleanup in Dry Run Mode */}
                  <div className="relative pb-8">
                    <div className="relative flex items-start">
                      <div className="h-12 w-12 rounded-full flex items-center justify-center bg-blue-600 z-10">
                        {maintenanceStatus?.dry_run_completed ? (
                          <FaCheck className="text-white h-6 w-6" />
                        ) : (
                          <span className="text-white font-medium">2</span>
                        )}
                      </div>
                      <div className="ml-4 min-w-0 flex-1">
                        <h4 className="text-base font-medium text-gray-900">Analyze Database (Dry Run)</h4>
                        <p className="text-sm text-gray-500">
                          Identify duplicate records and integrity issues without making changes.
                        </p>
                        <div className="mt-2">
                          {maintenanceStatus?.dry_run_completed ? (
                            <div>
                              <div className="text-green-600 flex items-center mb-2">
                                <FaCheck className="mr-1" />
                                <span>Analysis completed at {new Date(maintenanceStatus.dry_run_time).toLocaleString()}</span>
                              </div>
                              {dryRunResults && (
                                <div className="mt-1 bg-gray-100 p-3 rounded text-sm">
                                  <div className="font-medium">Findings:</div>
                                  <ul className="list-disc pl-5 mt-1">
                                    <li>{dryRunResults.duplicates_total || 0} duplicate records</li>
                                    <li>{dryRunResults.missing_relationships || 0} missing relationships</li>
                                    <li>{dryRunResults.name_standardizations || 0} non-standard entity names</li>
                                    <li>{dryRunResults.constraints_needed || 0} missing constraints</li>
                                  </ul>
                                </div>
                              )}
                              <button
                                onClick={handleRunDryRun}
                                disabled={isRunningDryRun}
                                className="mt-2 inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                <FaSync className={`mr-1 h-3 w-3 ${isRunningDryRun ? 'animate-spin' : ''}`} />
                                Analyze Again
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                if (!maintenanceStatus?.backup_exists) {
                                  setShowStepWarning(1);
                                } else {
                                  handleRunDryRun();
                                }
                              }}
                              disabled={isRunningDryRun}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <FaSearch className="mr-2" />
                              {isRunningDryRun ? 'Analyzing...' : 'Run Analysis'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Step 3: Run Actual Cleanup */}
                  <div className="relative pb-8">
                    <div className="relative flex items-start">
                      <div className="h-12 w-12 rounded-full flex items-center justify-center bg-blue-600 z-10">
                        {maintenanceStatus?.cleanup_completed ? (
                          <FaCheck className="text-white h-6 w-6" />
                        ) : (
                          <span className="text-white font-medium">3</span>
                        )}
                      </div>
                      <div className="ml-4 min-w-0 flex-1">
                        <h4 className="text-base font-medium text-gray-900">Fix Duplicate Records</h4>
                        <p className="text-sm text-gray-500">
                          Remove duplicate records, repair entity relationships, and standardize names.
                        </p>
                        <div className="mt-2">
                          {maintenanceStatus?.cleanup_completed ? (
                            <div>
                              <div className="text-green-600 flex items-center mb-2">
                                <FaCheck className="mr-1" />
                                <span>Cleanup completed at {new Date(maintenanceStatus.cleanup_time).toLocaleString()}</span>
                              </div>
                              {maintenanceStatus.cleanup_results && (
                                <div className="mt-1 bg-gray-100 p-3 rounded text-sm">
                                  <div className="font-medium">Results:</div>
                                  <ul className="list-disc pl-5 mt-1">
                                    <li>{maintenanceStatus.cleanup_results.duplicates_removed || 0} duplicates removed</li>
                                    <li>{maintenanceStatus.cleanup_results.relationships_fixed || 0} relationships repaired</li>
                                    <li>{maintenanceStatus.cleanup_results.names_standardized || 0} names standardized</li>
                                    <li>{maintenanceStatus.cleanup_results.constraints_added || 0} constraints added</li>
                                  </ul>
                                </div>
                              )}
                              <button
                                onClick={() => {
                                  console.log('Run Cleanup Again button clicked');
                                  // Reset the cleanup status immediately for visual feedback
                                  setMaintenanceStatus(prevStatus => ({
                                    ...prevStatus,
                                    cleanup_completed: false,
                                    cleanup_time: null,
                                    cleanup_results: null
                                  }));
                                  // Show the confirmation dialog
                                  setShowCleanupConfirmation(true);
                                }}
                                disabled={isRunningCleanup}
                                className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                <FaBroom className="mr-1 h-4 w-4" />
                                Run Cleanup Again
                              </button>
                            </div>
                          ) : showCleanupConfirmation ? (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                              <div className="flex">
                                <div className="flex-shrink-0">
                                  <FaExclamationTriangle className="h-5 w-5 text-yellow-400" />
                                </div>
                                <div className="ml-3">
                                  <h3 className="text-sm font-medium text-yellow-800">Confirm Database Cleanup</h3>
                                  <div className="mt-2 text-sm text-yellow-700">
                                    <p>This will fix data issues identified in the dry run. This process is safe but cannot be undone.</p>
                                  </div>
                                  <div className="mt-3 flex space-x-3">
                                    <button
                                      type="button"
                                      onClick={handleRunCleanup}
                                      disabled={isRunningCleanup}
                                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                      {isRunningCleanup ? 'Running...' : 'Yes, Fix Issues'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setShowCleanupConfirmation(false)}
                                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                if (!maintenanceStatus?.backup_exists) {
                                  setShowStepWarning(2);
                                } else if (!maintenanceStatus?.dry_run_completed) {
                                  setShowStepWarning(2);
                                } else {
                                  setShowCleanupConfirmation(true);
                                }
                              }}
                              disabled={false}
                              data-active-step={activeStep}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <FaBroom className="mr-2" />
                              Fix Issues
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Step 4: Run Vacuum */}
                  <div className="relative">
                    <div className="relative flex items-start">
                      <div className="h-12 w-12 rounded-full flex items-center justify-center bg-blue-600 z-10">
                        {maintenanceStatus?.vacuum_completed ? (
                          <FaCheck className="text-white h-6 w-6" />
                        ) : (
                          <span className="text-white font-medium">4</span>
                        )}
                      </div>
                      <div className="ml-4 min-w-0 flex-1">
                        <h4 className="text-base font-medium text-gray-900">Optimize Database</h4>
                        <p className="text-sm text-gray-500">
                          Optimize database storage and performance with VACUUM and REINDEX.
                        </p>
                        <div className="mt-2">
                          {maintenanceStatus?.vacuum_completed ? (
                            <div>
                              <div className="text-green-600 flex items-center">
                                <FaCheck className="mr-1" />
                                <span>Optimization completed at {new Date(maintenanceStatus.vacuum_time).toLocaleString()}</span>
                              </div>
                              {maintenanceStatus.vacuum_results && (
                                <div className="mt-1 bg-gray-100 p-3 rounded text-sm">
                                  <div className="font-medium">Results:</div>
                                  <ul className="list-disc pl-5 mt-1">
                                    <li>{(maintenanceStatus.vacuum_results.space_reclaimed_mb || 0).toFixed(2)} MB space reclaimed</li>
                                    <li>Database size reduced by {(maintenanceStatus.vacuum_results.percent_reduction || 0).toFixed(1)}%</li>
                                    <li>Operation completed in {(maintenanceStatus.vacuum_results.duration_seconds || 0).toFixed(1)} seconds</li>
                                  </ul>
                                </div>
                              )}
                              <button
                                onClick={() => setShowVacuumConfirmation(true)}
                                className="mt-2 inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                <FaMagic className="mr-1 h-3 w-3" />
                                Run Again
                              </button>
                            </div>
                          ) : showVacuumConfirmation ? (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                              <div className="flex">
                                <div className="flex-shrink-0">
                                  <FaExclamationTriangle className="h-5 w-5 text-yellow-400" />
                                </div>
                                <div className="ml-3">
                                  <h3 className="text-sm font-medium text-yellow-800">Confirm Database Optimization</h3>
                                  <div className="mt-2 text-sm text-yellow-700">
                                    <p>This will optimize storage and update statistics for better performance.</p>
                                    <div className="mt-2">
                                      <label className="inline-flex items-center">
                                        <input
                                          type="checkbox"
                                          className="form-checkbox h-4 w-4 text-blue-600"
                                          checked={skipReindex}
                                          onChange={(e) => setSkipReindex(e.target.checked)}
                                        />
                                        <span className="ml-2 text-sm text-yellow-700">Skip REINDEX (faster but less thorough)</span>
                                      </label>
                                    </div>
                                  </div>
                                  <div className="mt-3 flex space-x-3">
                                    <button
                                      type="button"
                                      onClick={handleRunVacuum}
                                      disabled={isRunningVacuum}
                                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                      {isRunningVacuum ? 'Running...' : 'Yes, Optimize Database'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setShowVacuumConfirmation(false)}
                                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                if (!maintenanceStatus?.backup_exists) {
                                  setShowStepWarning(3);
                                } else if (!maintenanceStatus?.dry_run_completed) {
                                  setShowStepWarning(3);
                                } else if (!maintenanceStatus?.cleanup_completed) {
                                  setShowStepWarning(3);
                                } else {
                                  setShowVacuumConfirmation(true);
                                }
                              }}
                              disabled={false}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <FaMagic className="mr-2" />
                              Optimize Database
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="px-4 py-3 bg-gray-100 rounded-md">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-1">
                    <FaExclamationTriangle className="h-4 w-4 text-yellow-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-600">
                      While all steps are available, it's strongly recommended to complete them in order. 
                      Running later steps without completing earlier ones may cause database instability.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Warning modal for out-of-order step execution */}
              {showStepWarning !== null && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full">
                    <div className="mb-4 flex items-start">
                      <div className="flex-shrink-0">
                        <FaExclamationTriangle className="h-6 w-6 text-yellow-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-medium text-yellow-800">Warning</h3>
                        <p className="mt-2 text-sm text-yellow-700">
                          {showStepWarning === 1 && 'Running analysis without a backup is risky. If issues occur, you won\'t be able to restore your data.'}
                          {showStepWarning === 2 && 'Fixing database issues without first identifying them with analysis is not recommended.'}
                          {showStepWarning === 3 && 'Optimizing the database before fixing issues may result in incomplete optimization.'}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-yellow-800">
                          Running steps out of order may cause database instability. Do you want to proceed anyway?
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3 mt-4">
                      <button
                        onClick={() => setShowStepWarning(null)}
                        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          const step = showStepWarning;
                          setShowStepWarning(null);
                          
                          if (step === 1) handleRunDryRun();
                          else if (step === 2) setShowCleanupConfirmation(true);
                          else if (step === 3) setShowVacuumConfirmation(true);
                        }}
                        className="px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
                      >
                        Proceed Anyway
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Legacy Database Cleanup Section (Hidden but kept for backward compatibility) */}
            <div className="hidden">
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
        </div>
      )}
    </div>
  );
};

export default Settings; 