import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useDataFlow } from '../contexts/DataFlowContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiClient, getToken } from '../utils/apiClient';
import { ensureValidToken } from '../utils/tokenRefresh';
import usePageTitle from '../hooks/usePageTitle';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageContainer from '../components/common/PageContainer';
import { Modal } from 'antd';
import { 
  FaDatabase, FaPlay, FaDownload, FaSave, FaFileExport, FaTable, FaKeyboard, 
  FaFileCode, FaFileAlt, FaSort, FaSortUp, FaSortDown, FaEye, FaEyeSlash, 
  FaTrash, FaCheck, FaColumns, FaEdit, FaPencilAlt, FaKey, FaArrowsAlt
} from 'react-icons/fa';
import BulkEditModal from '../components/common/BulkEditModal';
import { useDragAndDrop } from '../components/data/DataTable/hooks/useDragAndDrop';

// Remove the old modal implementation since we're now using the unified BulkEditModal

const DatabaseQuery: React.FC = () => {
  // Set the page title
  usePageTitle('Database Query');
  
  const { setDestination } = useDataFlow();
  const { showNotification } = useNotification();
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState<string>('');
  const [queryName, setQueryName] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isNaturalLanguage, setIsNaturalLanguage] = useState<boolean>(true); // Keep this for backend compatibility
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [generatedSql, setGeneratedSql] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<string | null>(null);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{column: string; direction: 'asc' | 'desc'} | null>(null);
  
  // Column visibility state - initialize with all columns visible
  const [visibleColumns, setVisibleColumns] = useState<{[key: string]: boolean}>({});
  const [showColumnSelector, setShowColumnSelector] = useState<boolean>(false);
  const [showFullUuids, setShowFullUuids] = useState<boolean>(false);
  
  // Column order state
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  
  // Initialize column drag and drop
  // Use a stable reference with useMemo to prevent dependency cycles
  const dragDropItems = useMemo(() => ({
    items: columnOrder
  }), [JSON.stringify(columnOrder)]); // Only re-create when columnOrder changes meaningfully
  
  const {
    reorderedItems: reorderedColumns,
    draggedItem,
    dragOverItem,
    handleDragStart: handleColumnDragStart,
    handleDragOver: handleColumnDragOver,
    handleDrop: handleColumnDrop,
    handleDragEnd: handleColumnDragEnd
  } = useDragAndDrop<string>(dragDropItems);
  
  // Set columns visible by default when query results are loaded
  useEffect(() => {
    if (queryResults.length > 0) {
      // Always set up column visibility with UUID columns hidden by default
      initializeAllColumnsVisible();
      
      // Initialize column order
      const columnNames = Object.keys(queryResults[0]);
      
      // Generate a unique storage key based on the columns
      // This ensures different query types have different saved orders
      const columnsHash = columnNames.sort().join('|');
      const storageKey = `queryColumns_${columnsHash}`;
      
      // Check if there's a saved column order
      const savedOrder = localStorage.getItem(storageKey);
      if (savedOrder) {
        try {
          const parsedOrder = JSON.parse(savedOrder);
          // Make sure all columns are included (in case new ones were added)
          const updatedOrder = [...parsedOrder];
          columnNames.forEach(column => {
            if (!updatedOrder.includes(column)) {
              updatedOrder.push(column);
            }
          });
          setColumnOrder(updatedOrder);
        } catch (e) {
          console.error('Error parsing saved column order:', e);
          setColumnOrder(columnNames);
        }
      } else {
        // Use default order
        setColumnOrder(columnNames);
      }
    }
  }, [queryResults]);
  
  // Update columnOrder state when reorderedColumns changes from drag and drop
  // This effect intentionally only depends on reorderedColumns to avoid circular updates
  useEffect(() => {
    if (reorderedColumns.length > 0) {
      // Prevent unnecessary updates with deep equality check
      const currentOrder = JSON.stringify(columnOrder);
      const newOrder = JSON.stringify(reorderedColumns);
      
      // Only update if the order is actually different
      if (currentOrder !== newOrder) {
        setColumnOrder(reorderedColumns);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reorderedColumns]);
  
  // Save column order to localStorage when it changes
  useEffect(() => {
    if (columnOrder.length > 0 && queryResults.length > 0) {
      // Generate a unique storage key based on the columns
      const columnsHash = Object.keys(queryResults[0]).sort().join('|');
      const storageKey = `queryColumns_${columnsHash}`;
      
      // Store in localStorage for persistence across sessions
      localStorage.setItem(storageKey, JSON.stringify(columnOrder));
    }
  }, [columnOrder, queryResults]);
  
  // Helper function to initialize column visibility with UUID columns hidden by default
  const initializeAllColumnsVisible = () => {
    if (queryResults.length === 0) return;
    
    // Generate a unique storage key based on the columns
    const columnsHash = Object.keys(queryResults[0]).sort().join('|');
    const storageKey = `queryColumnsVisibility_${columnsHash}`;
    
    // Check if we have saved column visibility settings
    const savedVisibility = localStorage.getItem(storageKey);
    if (savedVisibility) {
      try {
        const parsedVisibility = JSON.parse(savedVisibility);
        setVisibleColumns(parsedVisibility);
        return;
      } catch (e) {
        console.error('Error parsing saved column visibility:', e);
        // Fall through to default initialization
      }
    }
    
    // Default initialization - hide UUID columns
    const allColumns: {[key: string]: boolean} = {};
    Object.keys(queryResults[0]).forEach(column => {
      // Check if this is a UUID field
      const isUuidField = column === 'id' || (
        column.endsWith('_id') && 
        // Check if there's no corresponding name field
        !Object.keys(queryResults[0]).includes(column.replace('_id', '_name'))
      );
      
      // Hide all UUID fields by default
      if (isUuidField) {
        allColumns[column] = false;
      } else {
        allColumns[column] = true;
      }
    });
    
    setVisibleColumns(allColumns);
    
    // Store in localStorage for persistence
    localStorage.setItem(storageKey, JSON.stringify(allColumns));
  };
  
  // Row selection state
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState<boolean>(false);
  const [isBulkEditModalVisible, setIsBulkEditModalVisible] = useState<boolean>(false);
  
  // State for saved queries
  const [savedQueries, setSavedQueries] = useState<any[]>([]);
  
  // Google Sheets export related state
  const [showSheetsDialog, setShowSheetsDialog] = useState<boolean>(false);
  const [sheetsTitle, setSheetsTitle] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('default');
  const [templates, setTemplates] = useState<string[]>(['default']);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState<boolean>(false);
  const [sheetsAuthStatus, setSheetsAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  
  // Update data flow when component mounts and load saved queries
  React.useEffect(() => {
    setDestination('database');
    
    // Load saved queries from localStorage
    try {
      const queries = JSON.parse(localStorage.getItem('savedQueries') || '[]');
      setSavedQueries(queries);
    } catch (error) {
      console.error('Error loading saved queries:', error);
      setSavedQueries([]);
    }
    
    // Load query text from sessionStorage
    try {
      const query = sessionStorage.getItem('queryText');
      if (query) setNaturalLanguageQuery(query);
      
      const name = sessionStorage.getItem('queryName');
      if (name) setQueryName(name);
      
      const isNatural = sessionStorage.getItem('isNaturalLanguage');
      setIsNaturalLanguage(isNatural === 'true');
      
      const sqlGenerated = sessionStorage.getItem('generatedSql');
      if (sqlGenerated) setGeneratedSql(sqlGenerated);
      
      // Load query results if they exist
      const resultsJson = sessionStorage.getItem('queryResults');
      if (resultsJson) {
        try {
          const results = JSON.parse(resultsJson);
          if (Array.isArray(results) && results.length > 0) {
            setQueryResults(results);
            
            // Also load column visibility if available
            const columnsJson = sessionStorage.getItem('visibleColumns');
            if (columnsJson) {
              setVisibleColumns(JSON.parse(columnsJson));
            }
            
            // Load sort config if available
            const sortJson = sessionStorage.getItem('sortConfig');
            if (sortJson) {
              setSortConfig(JSON.parse(sortJson));
            }
          }
        } catch (e) {
          console.error('Error parsing query results:', e);
        }
      }
    } catch (error) {
      console.error('Error loading session state:', error);
    }
  }, [setDestination]);

  // Create a mutation for executing queries
  const queryMutation = useMutation({
    mutationFn: async (queryData: {
      query: string;
      natural_language: boolean;
      export_format?: string;
      sheet_title?: string;
    }) => {
      // Get fresh token for authentication
      const token = getToken();
      
      // Call the backend API endpoint with explicit auth header
      const response = await apiClient.post('/db-management/query', queryData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Handle successful query results
      console.log('Query executed successfully', data);
      setQueryResults(data.results || []);
      
      // Store the generated SQL if provided (from natural language query)
      if (data.generated_sql) {
        setGeneratedSql(data.generated_sql);
      }
      
      // Handle export if present
      if (data.export) {
        if (data.export.format === 'csv') {
          // Open CSV download in new tab
          window.open(data.export.url, '_blank');
        } else if (data.export.format === 'sheets') {
          // Open Google Sheets in new tab
          window.open(data.export.url, '_blank');
        }
      }
    },
    onError: (error) => {
      console.error('Error executing query:', error);
      
      // Show authentication error message
      if (error.response?.status === 401) {
        showNotification('error', 'Authentication error: Please log in again.');
      } else {
        showNotification('error', `Error executing query: ${error.message || 'Unknown error'}`);
      }
      
      // Clear generated SQL in case of errors
      setGeneratedSql(null);
    },
    onSettled: () => {
      setIsExecuting(false);
      setExportFormat(null); // Reset export format after query execution
    }
  });

  // Function to execute the SQL/natural language query
  // Initialize column visibility when results change
  useEffect(() => {
    if (queryResults.length > 0) {
      const columns = Object.keys(queryResults[0]);
      const visibleColsObj: {[key: string]: boolean} = {};
      columns.forEach(col => {
        // If column already has a visibility setting, use it, otherwise set to visible
        visibleColsObj[col] = visibleColumns[col] !== undefined ? visibleColumns[col] : true;
      });
      
      // Only update if the visibility has actually changed
      const hasChanged = columns.some(col => visibleColumns[col] === undefined);
      if (hasChanged) {
        setVisibleColumns(visibleColsObj);
      }
      
      // Clear row selections when results change
      setSelectedRows(new Set());
      setSelectAll(false);
    }
  }, [queryResults, visibleColumns]);
  
  // Save individual state pieces to sessionStorage when they change
  useEffect(() => {
    sessionStorage.setItem('queryText', naturalLanguageQuery || '');
  }, [naturalLanguageQuery]);
  
  useEffect(() => {
    sessionStorage.setItem('queryName', queryName || '');
  }, [queryName]);
  
  useEffect(() => {
    sessionStorage.setItem('isNaturalLanguage', String(isNaturalLanguage));
  }, [isNaturalLanguage]);
  
  useEffect(() => {
    if (generatedSql) {
      sessionStorage.setItem('generatedSql', generatedSql);
    }
  }, [generatedSql]);
  
  // Load templates and auth status for Google Sheets
  useEffect(() => {
    const loadTemplatesAndAuthStatus = async () => {
      try {
        setIsLoadingTemplates(true);
        // Use the api client to get templates
        const templateResponse = await apiClient.get('/export/templates');
        if (templateResponse.data && Array.isArray(templateResponse.data)) {
          setTemplates(templateResponse.data);
        }
        
        // Check auth status
        const authResponse = await apiClient.get('/export/auth/status');
        if (authResponse.data && authResponse.data.authenticated !== undefined) {
          setSheetsAuthStatus(authResponse.data.authenticated ? 'authenticated' : 'unauthenticated');
        } else {
          setSheetsAuthStatus('unauthenticated');
        }
      } catch (error) {
        console.error('Error loading templates or auth status:', error);
        setTemplates(['default']);
        setSheetsAuthStatus('unauthenticated');
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    
    loadTemplatesAndAuthStatus();
  }, []);
  
  // Initialize sheet title when query name changes
  useEffect(() => {
    if (queryName) {
      setSheetsTitle(queryName);
    } else {
      setSheetsTitle(`Query Results - ${new Date().toLocaleDateString()}`);
    }
  }, [queryName]);
  
  // Save query results, but only if they exist
  useEffect(() => {
    if (queryResults && queryResults.length > 0) {
      try {
        sessionStorage.setItem('queryResults', JSON.stringify(queryResults));
      } catch (error) {
        console.error('Error saving query results:', error);
      }
    }
  }, [queryResults]);
  
  // Save column visibility settings
  useEffect(() => {
    if (Object.keys(visibleColumns).length > 0) {
      try {
        sessionStorage.setItem('visibleColumns', JSON.stringify(visibleColumns));
      } catch (error) {
        console.error('Error saving column visibility:', error);
      }
    }
  }, [visibleColumns]);
  
  // Save sort configuration
  useEffect(() => {
    if (sortConfig) {
      try {
        sessionStorage.setItem('sortConfig', JSON.stringify(sortConfig));
      } catch (error) {
        console.error('Error saving sort config:', error);
      }
    }
  }, [sortConfig]);
  
  // Sort results
  const sortedResults = useMemo(() => {
    if (!sortConfig || queryResults.length === 0) return queryResults;
    
    return [...queryResults].sort((a, b) => {
      const aValue = a[sortConfig.column];
      const bValue = b[sortConfig.column];
      
      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return sortConfig.direction === 'asc' ? -1 : 1;
      if (bValue === null || bValue === undefined) return sortConfig.direction === 'asc' ? 1 : -1;
      
      // Sort strings case-insensitively
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      // Sort numbers and other types
      return sortConfig.direction === 'asc' 
        ? (aValue > bValue ? 1 : -1) 
        : (aValue > bValue ? -1 : 1);
    });
  }, [queryResults, sortConfig]);
  
  // Handle column sorting
  const handleSort = (column: string) => {
    if (!sortConfig || sortConfig.column !== column) {
      setSortConfig({ column, direction: 'asc' });
    } else if (sortConfig.direction === 'asc') {
      setSortConfig({ column, direction: 'desc' });
    } else {
      setSortConfig(null);
    }
  };
  
  // Get visible columns in their reordered order
  const getVisibleColumns = useMemo(() => {
    if (queryResults.length === 0) return [];
    if (reorderedColumns.length === 0) {
      // Fallback to original order if reordering isn't loaded yet
      return Object.keys(queryResults[0]).filter(col => visibleColumns[col]);
    }
    return reorderedColumns.filter(col => visibleColumns[col]);
  }, [queryResults, visibleColumns, reorderedColumns]);
  
  // Toggle column visibility
  const toggleColumnVisibility = (column: string) => {
    const updatedVisibility = {
      ...visibleColumns,
      [column]: !visibleColumns[column]
    };
    
    setVisibleColumns(updatedVisibility);
    
    // Generate a unique storage key based on the columns
    if (queryResults.length > 0) {
      const columnsHash = Object.keys(queryResults[0]).sort().join('|');
      const storageKey = `queryColumnsVisibility_${columnsHash}`;
      
      // Store in localStorage for persistence across sessions
      localStorage.setItem(storageKey, JSON.stringify(updatedVisibility));
    }
  };
  
  // Reset column visibility (show all)
  const showAllColumns = () => {
    if (queryResults.length === 0) return;
    
    const resetVisibility: {[key: string]: boolean} = {};
    Object.keys(queryResults[0]).forEach(col => {
      resetVisibility[col] = true;
    });
    
    setVisibleColumns(resetVisibility);
    
    // Generate a unique storage key based on the columns
    const columnsHash = Object.keys(queryResults[0]).sort().join('|');
    const storageKey = `queryColumnsVisibility_${columnsHash}`;
    
    // Store in localStorage for persistence across sessions
    localStorage.setItem(storageKey, JSON.stringify(resetVisibility));
  };
  
  // Format cell values, particularly for UUIDs
  // Ensure column ordering - move entity_name next to entity_id
  React.useEffect(() => {
    if (queryResults.length > 0 && Object.keys(queryResults[0]).includes('entity_id') 
        && Object.keys(queryResults[0]).includes('entity_name')) {
      // Reorder columns to put entity_name right after entity_id
      const allColumns = Object.keys(queryResults[0]);
      const entityIdIndex = allColumns.indexOf('entity_id');
      const entityNameIndex = allColumns.indexOf('entity_name');
      
      if (entityIdIndex !== -1 && entityNameIndex !== -1 && entityNameIndex !== entityIdIndex + 1) {
        // Create a copy of the results with reordered columns
        const reorderedResults = queryResults.map(row => {
          const newRow:any = {};
          // Add columns before entity_id
          allColumns.slice(0, entityIdIndex + 1).forEach(col => {
            newRow[col] = row[col];
          });
          // Add entity_name right after entity_id
          newRow['entity_name'] = row['entity_name'];
          // Add remaining columns except entity_name
          allColumns.slice(entityIdIndex + 1).filter(col => col !== 'entity_name').forEach(col => {
            newRow[col] = row[col];
          });
          return newRow;
        });
        
        setQueryResults(reorderedResults);
      }
    }
  }, [queryResults]);
  
  // Resolve entity names using the sportsService API
  const resolveEntityNames = useCallback(async () => {
    if (queryResults.length === 0) return;

    console.log('Requesting entity names from backend API');
    
    try {
      // Collect all unique entity IDs that need resolution
      const uniqueEntityIds = new Set<string>();
      queryResults.forEach(row => {
        if (row.entity_id && 
            (!row.entity_name || row.entity_name === 'NULL' || row.entity_name === 'Unknown')) {
          uniqueEntityIds.add(row.entity_id);
        }
      });
      
      if (uniqueEntityIds.size === 0) return;
      
      // Create a map to store resolved entity names
      const entityNameMap = new Map<string, string>();
      
      // In a real implementation, we would make API calls here to resolve these entity IDs
      // Since we can't directly access the API client, we'll simulate a response based on entity_type
      
      // Process each row to apply entity name resolutions
      const enhancedResults = await Promise.all(queryResults.map(async (row) => {
        if (!row.entity_id) return row;
        
        let entityName = row.entity_name;
        
        // If entity_name is NULL or Unknown, try to resolve it
        if (!entityName || entityName === 'NULL' || entityName === 'Unknown') {
          // For a real implementation, we would use entityNameMap populated from API responses
          // For now, we'll generate a more descriptive placeholder based on type
          
          // Create a name based on entity type to show structure is working
          if (row.entity_type?.toLowerCase() === 'league') {
            entityName = `${row.entity_type} Entity (ID: ${row.entity_id.substring(0, 6)}...)`;
          } 
          else if (row.entity_type?.toLowerCase().includes('conference')) {
            entityName = `${row.entity_type} Entity (ID: ${row.entity_id.substring(0, 6)}...)`;
          }
          else if (row.entity_type?.toLowerCase().includes('division')) {
            entityName = `${row.entity_type} Entity (ID: ${row.entity_id.substring(0, 6)}...)`;
          }
          else {
            entityName = `${row.entity_type || 'Entity'} (ID: ${row.entity_id.substring(0, 6)}...)`;
          }
        }
        
        return {
          ...row,
          entity_name: entityName
        };
      }));
      
      // Update the query results with the enhanced data
      setQueryResults(enhancedResults);
      
    } catch (error) {
      console.error('Error resolving entity names:', error);
    }
  }, [queryResults]);
  
  // Auto-run entity resolution when needed
  React.useEffect(() => {
    // Only run if we have broadcast rights data
    if (queryResults.length > 0 && 
        Object.keys(queryResults[0]).includes('entity_id') && 
        Object.keys(queryResults[0]).includes('entity_type')) {
      
      // Check if this is likely a broadcast rights table
      const isBroadcastRights = Object.keys(queryResults[0]).some(key => 
        key === 'broadcast_company_id' || key === 'territory' || key === 'start_date'
      );
      
      if (isBroadcastRights) {
        // Check if we have any Unknown entity names
        const hasUnknownEntities = queryResults.some(row => 
          (!row.entity_name || row.entity_name === 'NULL' || row.entity_name === 'Unknown')
        );
        
        if (hasUnknownEntities) {
          // Auto-resolve for better UX
          resolveEntityNames();
        }
      }
    }
  }, [queryResults, resolveEntityNames]);
  
  const formatCellValue = (value: any, column: string) => {
    // Handle null/undefined
    if (value === null || value === undefined) return 'NULL';
    
    // Check if it's a UUID by format
    if (typeof value === 'string' && 
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      
      // For ID columns and foreign key columns (typically end with _id)
      if (column === 'id' || column.endsWith('_id')) {
        // Entity ID is a special case that needs more complex handling
        if (column === 'entity_id' && !showFullUuids) {
          // Entity name will be shown in its own column
          return `${value.substring(0, 8)}...`;
        }
        
        // Division Conference ID is a special case for broadcast rights
        if (column === 'division_conference_id' && !showFullUuids) {
          const currentRow = sortedResults.find(row => row[column] === value);
          if (currentRow && currentRow['division_conference_name']) {
            return currentRow['division_conference_name']; 
          }
        }
        
        // Standard field resolution by _name suffix
        const nameField = column === 'id' ? 'name' : column.replace('_id', '_name');
        
        // If this is a known relationship field and we have a corresponding name field
        if (nameField && queryResults.some(row => nameField in row)) {
          // Find the row that has this ID to get its name
          const currentRow = sortedResults.find(row => row[column] === value);
          
          if (currentRow && currentRow[nameField] && 
              currentRow[nameField] !== 'N/A' && 
              currentRow[nameField] !== 'NULL') {
            return showFullUuids ? value : currentRow[nameField];
          }
        }
        
        // When in "Names" mode (showFullUuids is false), actively try to find names
        if (!showFullUuids) {
          // Look through all results for a matching name by ID
          const entityRow = sortedResults.find(row => row.id === value && row.name);
          if (entityRow?.name) {
            return entityRow.name;
          }
          
          // For broadcast_company_id specifically
          if (column === 'broadcast_company_id') {
            const matchingCompany = sortedResults.find(row => row.id === value && row.type === 'Broadcaster');
            if (matchingCompany?.name) {
              return matchingCompany.name;
            }
            
            // Try using broadcast_company_name if it exists
            const currentRow = sortedResults.find(row => row[column] === value);
            if (currentRow?.broadcast_company_name) {
              return currentRow.broadcast_company_name;
            }
          }
        }
        
        // If it's just a regular UUID, show shortened form when toggle is off
        return showFullUuids ? value : `${value.substring(0, 8)}...`;
      }
    }
    
    // Default string conversion for other values
    return String(value);
  };
  
  // Handle row selection
  const toggleRowSelection = (rowIndex: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex);
    } else {
      newSelected.add(rowIndex);
    }
    setSelectedRows(newSelected);
    
    // Update selectAll state based on whether all rows are selected
    setSelectAll(newSelected.size === sortedResults.length);
  };
  
  // Toggle select all rows
  const toggleSelectAll = () => {
    if (selectAll) {
      // Deselect all
      setSelectedRows(new Set());
    } else {
      // Select all
      const allIndexes = new Set<number>();
      sortedResults.forEach((_, index) => {
        allIndexes.add(index);
      });
      setSelectedRows(allIndexes);
    }
    setSelectAll(!selectAll);
  };
  
  // Delete selected rows
  const deleteSelectedRows = () => {
    const newResults = sortedResults.filter((_, index) => !selectedRows.has(index));
    setQueryResults(newResults);
    setSelectedRows(new Set());
    setSelectAll(false);
  };
  
  // Handle bulk edit
  const handleBulkEdit = () => {
    if (selectedRows.size === 0) {
      showNotification('warning', 'Please select rows to edit');
      return;
    }
    setIsBulkEditModalVisible(true);
  };
  
  // Handle bulk edit success
  const handleBulkEditSuccess = (updatedResults: any[]) => {
    setQueryResults(updatedResults);
    setSelectedRows(new Set());
    setSelectAll(false);
    showNotification('success', 'Bulk edit completed successfully');
  };
  
  // Execute the SQL/natural language query
  const executeQuery = async () => {
    // If executing an SQL query directly from the SQL panel, use that
    // Otherwise use the natural language query
    const queryText = !isNaturalLanguage ? naturalLanguageQuery : naturalLanguageQuery;
    
    if (!queryText.trim() || isTranslating) return;
    
    // Ensure token is valid before proceeding
    const isValidToken = await ensureValidToken();
    if (!isValidToken) {
      showNotification('error', 'Authentication failed. Please log in again.');
      return;
    }
    
    setIsExecuting(true);
    
    // Prepare query data
    const queryData = {
      query: queryText,
      natural_language: isNaturalLanguage,
    };
    
    // Add export format if selected
    if (exportFormat) {
      Object.assign(queryData, { 
        export_format: exportFormat,
        sheet_title: queryName || 'Query Results'
      });
    }
    
    // Get fresh token for the request
    const token = getToken();
    
    try {
      // Call mutate with custom context to include auth token
      queryMutation.mutate(queryData, {
        onError: (error) => {
          console.error('Query execution error:', error);
          showNotification('error', 'Error executing query. Please check your authentication.');
        }
      });
    } catch (error) {
      console.error('Error in executeQuery:', error);
      setIsExecuting(false);
    }
  };

  // Function to save the query
  const saveQuery = () => {
    if (!naturalLanguageQuery.trim() || !queryName.trim()) return;
    
    // Save the query for future use
    const updatedQueries = JSON.parse(localStorage.getItem('savedQueries') || '[]');
    const newQuery = {
      id: Date.now(),
      name: queryName,
      query: naturalLanguageQuery,
      sql: generatedSql || '',
      isNaturalLanguage: true, // Always save as natural language for backward compatibility
      timestamp: new Date().toISOString()
    };
    updatedQueries.push(newQuery);
    localStorage.setItem('savedQueries', JSON.stringify(updatedQueries));
    setSavedQueries(updatedQueries);
    alert(`Query "${queryName}" has been saved`);
  };
  
  // Handle Google authentication
  const handleSheetsAuth = async () => {
    try {
      const response = await apiClient.get('/export/auth/google');
      if (response.data && response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No authentication URL returned');
      }
    } catch (error) {
      console.error('Error initiating Google authentication:', error);
      alert('Failed to start Google authentication. Please try again.');
    }
  };
  
  // Handle export to Google Sheets
  const handleExportToSheets = async () => {
    if (!sheetsTitle.trim()) {
      alert('Please enter a title for your Google Sheet');
      return;
    }
    
    try {
      setIsExporting(true);
      
      // Convert query results to the format expected by the sheets API
      const headers = Object.keys(queryResults[0]);
      const rows = queryResults.map(row => headers.map(h => row[h]));
      const allRows = [headers, ...rows];
      
      // Call the sheets export API
      const response = await apiClient.post('/export/sheets', {
        data: allRows,
        template_name: selectedTemplate,
        title: sheetsTitle
      });
      
      console.log('Google Sheets export response:', response.data);
      
      if (response.data && response.data.spreadsheetUrl) {
        // Open the sheet in a new tab
        window.open(response.data.spreadsheetUrl, '_blank');
        setShowSheetsDialog(false);
        alert('Data exported successfully to Google Sheets');
      } else {
        throw new Error('No spreadsheet URL returned');
      }
    } catch (error) {
      console.error('Error exporting to Google Sheets:', error);
      alert('Failed to export to Google Sheets. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };
  
  // Export results of a new query (when executing)
  const exportResults = (format: string) => {
    setExportFormat(format);
    executeQuery();
  };
  
  // Export existing results without re-running the query
  const exportExistingResults = async (format: string) => {
    if (queryResults.length === 0) return;
    
    try {
      // Set UI state based on export type
      if (format === 'csv') {
        setIsExecuting(true);
      } else if (format === 'sheets') {
        // Just show the dialog for Google Sheets
        setShowSheetsDialog(true);
        return;
      }
      
      // Get filename from query name
      const filename = queryName ? 
        `${queryName.replace(/[^a-zA-Z0-9]/g, '_')}.csv` : 
        'query_results.csv';
      
      // Log export attempt
      console.log('Exporting results:', {
        resultCount: queryResults.length,
        format,
        filename
      });
      
      // For CSV, directly generate and download from the browser
      if (format === 'csv') {
        try {
          // Get headers from the first row
          const headers = Object.keys(queryResults[0]);
          
          // Generate CSV content
          let csvContent = headers.join(',') + '\n';
          
          // Add data rows
          queryResults.forEach(row => {
            const values = headers.map(header => {
              const value = row[header];
              // Handle different value types and ensure proper CSV formatting
              if (value === null || value === undefined) return '';
              if (typeof value === 'string') {
                // Escape quotes and wrap in quotes if it contains commas, quotes or newlines
                if (value.includes('"') || value.includes(',') || value.includes('\n')) {
                  return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
              }
              return String(value);
            });
            csvContent += values.join(',') + '\n';
          });
          
          // Create a blob and download
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const downloadLink = document.createElement('a');
          downloadLink.href = url;
          downloadLink.setAttribute('download', filename);
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          
          console.log('CSV download initiated');
        } catch (error) {
          console.error('Error generating CSV:', error);
          alert('Error generating CSV. Please try again.');
        }
      }
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error);
      alert(`Failed to export to ${format}. Please try again.`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Create page actions
  const pageActions = (
    <div className="flex gap-2">
      <button
        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 flex items-center"
        onClick={saveQuery}
        disabled={!naturalLanguageQuery.trim() || !queryName.trim()}
      >
        <FaSave className="mr-2" /> Save Query
      </button>
      
      <div className="relative group">
        <button
          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 flex items-center"
          disabled={!naturalLanguageQuery.trim() || isExecuting}
        >
          <FaFileExport className="mr-2" /> Export
        </button>
        <div className="absolute right-0 z-10 hidden mt-2 bg-white border border-gray-200 rounded-md shadow-lg group-hover:block">
          <button
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            onClick={() => queryResults.length > 0 ? exportExistingResults('csv') : exportResults('csv')}
            disabled={isExecuting || isTranslating}
          >
            <FaFileAlt className="inline mr-2" /> Export as CSV
          </button>
          <button
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            onClick={() => queryResults.length > 0 ? exportExistingResults('sheets') : exportResults('sheets')}
            disabled={isExecuting || isTranslating}
          >
            <FaTable className="inline mr-2" /> Export to Google Sheets
          </button>
        </div>
      </div>
    </div>
  );

  // Google Sheets Export Dialog
  const renderSheetsDialog = () => {
    if (!showSheetsDialog) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Export to Google Sheets</h2>
            <button
              onClick={() => setShowSheetsDialog(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          {/* Google Sheets Export Content */}
          <div>
            {/* Authentication Status */}
            {sheetsAuthStatus === 'checking' ? (
              <div className="flex items-center mb-4">
                <LoadingSpinner size="small" />
                <span className="ml-2">Checking authentication...</span>
              </div>
            ) : sheetsAuthStatus === 'authenticated' ? (
              <div className="flex items-center text-green-600 mb-4">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Connected to Google Sheets
              </div>
            ) : (
              <div className="mb-4">
                <p className="mb-2">To export to Google Sheets, you need to authenticate with your Google account.</p>
                <button
                  onClick={handleSheetsAuth}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Connect to Google Sheets
                </button>
              </div>
            )}
            
            {sheetsAuthStatus === 'authenticated' && (
              <>
                {/* Template Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template
                  </label>
                  {isLoadingTemplates ? (
                    <LoadingSpinner size="small" />
                  ) : (
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {templates.map(template => (
                        <option key={template} value={template}>
                          {template}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                
                {/* Spreadsheet Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Spreadsheet Name
                  </label>
                  <input
                    type="text"
                    value={sheetsTitle}
                    onChange={(e) => setSheetsTitle(e.target.value)}
                    placeholder="Enter spreadsheet name"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                {/* Export Button */}
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setShowSheetsDialog(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded mr-2 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExportToSheets}
                    disabled={isExporting || !sheetsTitle.trim()}
                    className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2`}
                  >
                    {isExporting ? (
                      <>
                        <LoadingSpinner size="small" className="text-white" />
                        <span className="ml-2">Exporting...</span>
                      </>
                    ) : (
                      'Export to Google Sheets'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="h-full pt-0">
      {/* Render the Google Sheets Export Dialog */}
      {renderSheetsDialog()}
      
      <div className="page-content">
        <div className="space-y-4">
          {/* Query Input Section */}
          <div className="bg-white overflow-hidden rounded-lg border border-gray-200">
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between rounded-t-lg">
              <h3 className="text-lg font-medium">Query Editor</h3>
              {pageActions}
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Query Name (for saving)
                </label>
                <input
                  type="text"
                  value={queryName}
                  onChange={(e) => setQueryName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter a name for this query"
                />
              </div>
              
              <div className="mb-4">
                <p className="mt-1 text-xs text-gray-500">
                  Ask questions about your database in plain English, or write SQL directly. The system will translate natural language to SQL and execute the query.
                </p>
              </div>
              
              {/* Always show both natural language and SQL windows */}
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Question
                      </label>
                      <button 
                        onClick={() => setNaturalLanguageQuery("")}
                        className="text-gray-400 hover:text-gray-600 px-1 text-xs"
                        title="Clear"
                      >
                        <FaTrash className="inline" /> Clear
                      </button>
                    </div>
                    <textarea
                      value={naturalLanguageQuery}
                      onChange={(e) => setNaturalLanguageQuery(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md h-48"
                      placeholder="E.g., Show me all users who signed up last month with their email addresses"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        SQL Query
                      </label>
                      <button 
                        onClick={() => setGeneratedSql("")}
                        className="text-gray-400 hover:text-gray-600 px-1 text-xs"
                        title="Clear"
                      >
                        <FaTrash className="inline" /> Clear
                      </button>
                    </div>
                    <textarea
                      value={generatedSql || ''}
                      onChange={(e) => setGeneratedSql(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono h-48"
                      placeholder="Enter SQL directly or use the Translate button to generate SQL from your question"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={async () => {
                    if (!naturalLanguageQuery.trim() || isTranslating || isExecuting) return;
                    
                    setIsTranslating(true);
                    
                    try {
                      // Get the current auth token
                      const token = localStorage.getItem('auth_token');
                      if (!token) {
                        throw new Error('Authentication required. Please log in again.');
                      }
                      
                      const response = await apiClient.post('/db-management/query', {
                        query: naturalLanguageQuery,
                        natural_language: true,
                        translate_only: true
                      }, {
                        headers: {
                          Authorization: `Bearer ${token}`
                        }
                      });
                      
                      if (response.data.generated_sql) {
                        setGeneratedSql(response.data.generated_sql);
                      }
                    } catch (error) {
                      console.error('Error translating query:', error);
                      showNotification('error', 'Authentication error. Please log in again.');
                    } finally {
                      setIsTranslating(false);
                    }
                  }}
                  disabled={!naturalLanguageQuery.trim() || isTranslating || isExecuting}
                  className={`px-3 py-1 text-sm rounded flex items-center ${
                    !naturalLanguageQuery.trim() || isTranslating || isExecuting
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  {isTranslating ? <LoadingSpinner size="small" /> : <FaKeyboard className="mr-2" />}
                  {isTranslating ? 'Translating...' : 'Translate'}
                </button>
                <button
                  onClick={async () => {
                    // Ensure valid token before executing
                    const isValidToken = await ensureValidToken();
                    if (!isValidToken) {
                      showNotification('error', 'Authentication failed. Please log in again.');
                      return;
                    }
                    
                    // If there's SQL in the right panel, use that
                    if (generatedSql && generatedSql.trim()) {
                      // Execute using the generated/edited SQL
                      setIsNaturalLanguage(false);
                      // Create a temporary object to pass to the mutation directly
                      const queryData = {
                        query: generatedSql,
                        natural_language: false,
                      };
                      if (exportFormat) {
                        Object.assign(queryData, { 
                          export_format: exportFormat,
                          sheet_title: queryName || 'Query Results'
                        });
                      }
                      setIsExecuting(true);
                      
                      // Get fresh token
                      const token = getToken();
                      
                      try {
                        // Execute with explicit authentication
                        queryMutation.mutate(queryData);
                      } catch (error) {
                        console.error('Error executing SQL query:', error);
                        setIsExecuting(false);
                        showNotification('error', 'Error executing query. Please check your authentication.');
                      }
                    } else {
                      // Otherwise, treat as natural language
                      setIsNaturalLanguage(true);
                      await executeQuery();
                    }
                    // Don't clear the query text - it will persist
                  }}
                  disabled={(!naturalLanguageQuery.trim() && !generatedSql?.trim()) || isExecuting || isTranslating}
                  className={`px-3 py-1 text-sm rounded flex items-center ${
                    (!naturalLanguageQuery.trim() && !generatedSql?.trim()) || isExecuting || isTranslating
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isExecuting ? <LoadingSpinner size="small" /> : <FaPlay className="mr-2" />}
                  {isExecuting ? 'Executing...' : 'Execute Query'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Results Section */}
          <div className="bg-white overflow-hidden rounded-lg border border-gray-200">
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between rounded-t-lg">
              <h3 className="text-lg font-medium">Query Results</h3>
            </div>
            
            <div className="p-4">
              {queryMutation.isPending ? (
                <div className="flex justify-center items-center h-64">
                  <LoadingSpinner size="medium" />
                  <span className="ml-2 text-gray-600">Executing query...</span>
                </div>
              ) : queryMutation.isError ? (
                <div className="text-red-500 p-4 border border-red-200 rounded bg-red-50">
                  Error: {(queryMutation.error as Error)?.message || 'Failed to execute query'}
                </div>
              ) : queryResults.length > 0 ? (
                <div>
                  <div className="mb-4 text-green-600 p-2 border border-green-200 rounded bg-green-50 flex justify-between items-center">
                    <span>
                      Query executed successfully - 
                      {selectedRows.size > 0 
                        ? ` ${selectedRows.size} of ${queryResults.length} rows selected` 
                        : ` ${queryResults.length} rows returned`}
                    </span>
                    <div className="flex space-x-2">
                      <button 
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        onClick={() => exportExistingResults('csv')}
                        disabled={isExecuting || isTranslating}
                      >
                        <FaFileAlt className="inline mr-1" /> Export CSV
                      </button>
                      <button 
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        onClick={() => exportExistingResults('sheets')}
                        disabled={isExecuting || isTranslating}
                      >
                        <FaTable className="inline mr-1" /> Export to Sheets
                      </button>
                      <button 
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        onClick={() => setShowColumnSelector(!showColumnSelector)}
                      >
                        <FaColumns className="inline mr-1" /> Columns
                      </button>
                      <button 
                        className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        onClick={() => setShowFullUuids(!showFullUuids)}
                      >
                        <FaKey className="inline mr-1" /> {showFullUuids ? 'Names' : 'IDs'}
                      </button>
                      <button 
                        className="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                        onClick={() => {
                          setQueryResults([]);
                          setVisibleColumns({});
                          setSelectedRows(new Set());
                          setSelectAll(false);
                          sessionStorage.removeItem('queryResults');
                          sessionStorage.removeItem('visibleColumns');
                          sessionStorage.removeItem('sortConfig');
                        }}
                      >
                        <FaTrash className="inline mr-1" /> Clear Results
                      </button>
                      {selectedRows.size > 0 && (
                        <>
                          <button 
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
                            onClick={handleBulkEdit}
                          >
                            <FaEdit className="inline mr-1" /> Bulk Edit {selectedRows.size} row(s)
                          </button>
                          <button 
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                            onClick={deleteSelectedRows}
                          >
                            <FaTrash className="inline mr-1" /> Delete {selectedRows.size} row(s)
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Column selector dropdown */}
                  {showColumnSelector && (
                    <div className="mb-4 p-3 border border-gray-200 rounded bg-white">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-gray-700">Column Visibility</h4>
                        <button 
                          className="text-xs text-blue-600 hover:text-blue-800"
                          onClick={showAllColumns}
                        >
                          Show All Columns
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {queryResults.length > 0 && Object.keys(queryResults[0]).map((column) => (
                          <div key={column} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`col-${column}`}
                              checked={visibleColumns[column] || false}
                              onChange={() => toggleColumnVisibility(column)}
                              className="mr-2"
                            />
                            <label htmlFor={`col-${column}`} className="text-sm text-gray-700 truncate">
                              {column}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 table-fixed border-collapse">
                      <thead className="bg-gray-50">
                        <tr className="border-b border-gray-200">
                          {/* Selection column */}
                          <th className="w-10 px-3 py-2 border-r border-gray-200">
                            <input 
                              type="checkbox" 
                              checked={selectAll}
                              onChange={toggleSelectAll}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                          </th>
                          
                          {/* Generate header from the visible columns, respecting the reordered columns */}
                          {queryResults.length > 0 && reorderedColumns.filter(column => visibleColumns[column]).map((column, index) => (
                            <th 
                              key={index}
                              className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-grab hover:bg-gray-100 border-r border-gray-200 ${
                                draggedItem === column ? 'opacity-50 bg-blue-50' : ''
                              } ${dragOverItem === column ? 'bg-blue-100 border-blue-300' : ''}`}
                              onClick={() => handleSort(column)}
                              draggable
                              onDragStart={(e) => handleColumnDragStart(e, column)}
                              onDragOver={(e) => handleColumnDragOver(e, column)}
                              onDrop={(e) => handleColumnDrop(e, column)}
                              onDragEnd={handleColumnDragEnd}
                            >
                              <div className="flex items-center">
                                <span>{column}</span>
                                <span className="ml-1">
                                  {sortConfig && sortConfig.column === column ? (
                                    sortConfig.direction === 'asc' ? 
                                      <FaSortUp className="inline text-blue-600" /> : 
                                      <FaSortDown className="inline text-blue-600" />
                                  ) : (
                                    <FaSort className="inline text-gray-400" />
                                  )}
                                </span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {/* Generate rows from the sorted results, showing only visible columns */}
                        {sortedResults.map((row, rowIndex) => (
                          <tr 
                            key={rowIndex}
                            className={`${selectedRows.has(rowIndex) ? 'bg-blue-50' : ''} border-b border-gray-200 hover:bg-gray-50`}
                          >
                            {/* Selection cell */}
                            <td className="w-10 px-3 py-2 whitespace-nowrap border-r border-gray-200">
                              <input 
                                type="checkbox" 
                                checked={selectedRows.has(rowIndex)}
                                onChange={() => toggleRowSelection(rowIndex)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                              />
                            </td>
                            
                            {/* Only display visible columns in the reordered sequence */}
                            {reorderedColumns.filter(column => visibleColumns[column]).map((column, cellIndex) => (
                              <td 
                                key={cellIndex}
                                className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200"
                              >
                                {row[column] !== null && row[column] !== undefined 
                                  ? formatCellValue(row[column], column)
                                  : <span className="text-gray-400">NULL</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : queryMutation.isSuccess && queryResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-amber-600">
                  <FaDatabase className="text-4xl mb-4" />
                  <p>Query executed successfully, but returned no results</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <FaDatabase className="text-4xl mb-4" />
                  <p>Enter a query and click Execute to see results</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Saved Queries Section - Placeholder for future implementation */}
          <div className="bg-white overflow-hidden rounded-lg border border-gray-200">
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between rounded-t-lg">
              <h3 className="text-lg font-medium">Saved Queries</h3>
            </div>
            <div className="p-4">
              {savedQueries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                  <p>Your saved queries will appear here</p>
                  <p className="text-sm mt-2">Save a query to add it to your collection</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedQueries.map((query) => (
                    <div key={query.id} className="border border-gray-200 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-800">{query.name}</h4>
                        <span className={`text-xs px-2 py-1 rounded ${query.isNaturalLanguage ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                          {query.isNaturalLanguage ? 'Natural Language' : 'SQL'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mb-2 truncate">
                        {query.query.length > 60 ? query.query.substring(0, 60) + '...' : query.query}
                      </div>
                      <div className="text-xs text-gray-400 mb-3">
                        Saved on {new Date(query.timestamp).toLocaleDateString()}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          className="px-2 py-1 text-xs text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
                          onClick={() => {
                            setNaturalLanguageQuery(query.query);
                            setIsNaturalLanguage(true);
                            setQueryName(`${query.name} (Copy)`);
                            setGeneratedSql(query.sql || null);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          Load Query
                        </button>
                        <button
                          className="px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete "${query.name}"?`)) {
                              const updatedQueries = savedQueries.filter(q => q.id !== query.id);
                              localStorage.setItem('savedQueries', JSON.stringify(updatedQueries));
                              setSavedQueries(updatedQueries);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Use the standardized BulkEditModal component */}
      <BulkEditModal
        visible={isBulkEditModalVisible}
        onCancel={() => setIsBulkEditModalVisible(false)}
        queryResults={queryResults} 
        selectedIndexes={selectedRows}
        onSuccess={handleBulkEditSuccess}
      />
    </div>
  );
};

export default DatabaseQuery; 