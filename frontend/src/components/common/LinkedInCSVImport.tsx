import React, { useState, useCallback, useRef } from 'react';
import { useApiClient } from '../../hooks/useApiClient';
import { useNotification } from '../../contexts/NotificationContext';
import { FaFileUpload, FaLinkedin, FaSpinner } from 'react-icons/fa';

interface ImportStats {
  total_contacts: number;
  imported_contacts: number;
  matched_brands: number;
  import_errors: Array<{
    row: Record<string, string>;
    error: string;
  }>;
}

interface LinkedInCSVImportProps {
  onImportComplete?: (stats: ImportStats) => void;
}

const LinkedInCSVImport: React.FC<LinkedInCSVImportProps> = ({ onImportComplete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiClient = useApiClient();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [matchBrands, setMatchBrands] = useState(true);
  const [matchThreshold, setMatchThreshold] = useState(0.6);
  const [importSourceTag, setImportSourceTag] = useState('');

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setImportStats(null);

    try {
      console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('import_source_tag', importSourceTag);
      
      console.log('FormData entries:');
      for (const entry of formData.entries()) {
        console.log('- Entry:', entry[0], entry[1]);
      }
      
      const queryParams = new URLSearchParams({
        auto_match_brands: String(matchBrands),
        match_threshold: String(matchThreshold)
      }).toString();
      const url = `/api/v1/contacts/import/linkedin?${queryParams}`;
      
      console.log('Sending file to URL:', url);

      const response = await apiClient.post<ImportStats>(url, formData, {
        requiresAuth: true
      });

      const data = response.data;
      console.log('LinkedIn CSV import response:', data);
      setImportStats(data);
      showNotification(
        'success',
        `Successfully imported ${data.imported_contacts} contacts with ${data.matched_brands} brand matches`
      );
      
      if (onImportComplete) {
        onImportComplete(data);
      }

    } catch (error: any) {
      console.error('Error importing contacts:', error);
      const message = error.response?.data?.detail || error.message || 'Failed to import contacts. Please try again.';
      showNotification(
        'error',
        message
      );
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [apiClient, matchBrands, matchThreshold, importSourceTag, onImportComplete, showNotification]);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="relative p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <FaLinkedin className="text-blue-600 mr-2" />
        Import LinkedIn Contacts
      </h2>
      
      <div className="mb-4">
        <p className="text-gray-600 mb-2">
          Import your LinkedIn connections from a CSV export file. The file should include
          fields like First Name, Last Name, Email, Company, and Position.
        </p>
        <div className="text-sm text-gray-500 mb-4">
          <strong>How to export your LinkedIn connections:</strong>
          <ol className="list-decimal pl-5 mt-1">
            <li>Go to LinkedIn and click on "My Network"</li>
            <li>Click on "Connections"</li>
            <li>Click on the gear icon (⚙️) to open settings</li>
            <li>Under "Advanced actions", select "Export connections"</li>
            <li>Choose CSV format and download the file</li>
          </ol>
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="importSourceTag" className="block text-sm font-medium text-gray-700 mb-1">
          Import Source Tag (Optional)
        </label>
        <input
          type="text"
          id="importSourceTag"
          value={importSourceTag}
          onChange={(e) => setImportSourceTag(e.target.value)}
          placeholder="e.g., LinkedIn Export Q агрессор, Conference Leads"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">
          A label to identify this batch of imported contacts.
        </p>
      </div>

      <div className="mb-4">
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="matchBrands"
            checked={matchBrands}
            onChange={(e) => setMatchBrands(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="matchBrands" className="text-sm font-medium">
            Auto-match companies to existing brands
          </label>
        </div>
        
        {matchBrands && (
          <div className="ml-6">
            <label htmlFor="matchThreshold" className="block text-sm font-medium mb-1">
              Match threshold: {matchThreshold}
            </label>
            <input
              type="range"
              id="matchThreshold"
              min="0.1"
              max="1"
              step="0.05"
              value={matchThreshold}
              onChange={(e) => setMatchThreshold(parseFloat(e.target.value))}
              className="w-full max-w-xs"
            />
            <div className="flex justify-between text-xs text-gray-500 max-w-xs">
              <span>Low (more matches)</span>
              <span>High (fewer matches)</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <input
          type="file"
          ref={fileInputRef}
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={triggerFileInput}
          disabled={loading}
          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 w-full"
        >
          {loading ? (
            <>
              <FaSpinner className="animate-spin mr-2" />
              Importing...
            </>
          ) : (
            <>
              <FaFileUpload className="mr-2" />
              Select CSV File
            </>
          )}
        </button>
      </div>

      {importStats && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">Import Results</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white p-3 rounded shadow-sm">
              <div className="text-2xl font-bold text-blue-600">{importStats.total_contacts}</div>
              <div className="text-xs text-gray-500">Total Contacts</div>
            </div>
            <div className="bg-white p-3 rounded shadow-sm">
              <div className="text-2xl font-bold text-green-600">{importStats.imported_contacts}</div>
              <div className="text-xs text-gray-500">Imported</div>
            </div>
            <div className="bg-white p-3 rounded shadow-sm">
              <div className="text-2xl font-bold text-purple-600">{importStats.matched_brands}</div>
              <div className="text-xs text-gray-500">Brand Matches</div>
            </div>
          </div>
          
          {importStats.import_errors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-600 mb-1">Errors ({importStats.import_errors.length})</h4>
              <div className="max-h-40 overflow-y-auto text-xs bg-white p-2 rounded border border-red-200">
                {importStats.import_errors.map((error, index) => (
                  <div key={index} className="mb-1 pb-1 border-b border-gray-100">
                    <span className="text-red-600">{error.error}</span>
                    <pre className="text-gray-500 mt-1 overflow-x-auto">
                      {JSON.stringify(error.row, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LinkedInCSVImport;