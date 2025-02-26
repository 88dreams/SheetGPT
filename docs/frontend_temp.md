# Frontend Integration Improvements for SheetGPT

This document outlines the step-by-step plan for implementing UI integration improvements for the SheetGPT application, focusing on creating a more cohesive experience between the Chat, Data Management, and Sports Database components.

## Phase 1: Global Context and Data Flow Tracking

### Step 1: Create a Data Flow Context

First, we need to create a global context to track data as it moves between components.

```tsx
// frontend/src/contexts/DataFlowContext.tsx

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DataSource {
  type: 'chat' | 'manual' | 'import';
  id?: string; // Message ID, import ID, etc.
  timestamp: Date;
  description: string;
}

interface DataFlowState {
  currentSource?: DataSource;
  currentData?: any;
  currentDestination?: 'data' | 'sportsdb' | 'export';
  dataJourney: DataSource[];
}

interface DataFlowContextType {
  dataFlow: DataFlowState;
  setSource: (source: DataSource) => void;
  setData: (data: any) => void;
  setDestination: (destination: 'data' | 'sportsdb' | 'export') => void;
  resetFlow: () => void;
  addToJourney: (source: DataSource) => void;
}

const DataFlowContext = createContext<DataFlowContextType | undefined>(undefined);

export const DataFlowProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [dataFlow, setDataFlow] = useState<DataFlowState>({
    dataJourney: []
  });

  const setSource = (source: DataSource) => {
    setDataFlow(prev => ({ ...prev, currentSource: source }));
  };

  const setData = (data: any) => {
    setDataFlow(prev => ({ ...prev, currentData: data }));
  };

  const setDestination = (destination: 'data' | 'sportsdb' | 'export') => {
    setDataFlow(prev => ({ ...prev, currentDestination: destination }));
  };

  const resetFlow = () => {
    setDataFlow({ dataJourney: [] });
  };

  const addToJourney = (source: DataSource) => {
    setDataFlow(prev => ({
      ...prev,
      dataJourney: [...prev.dataJourney, source]
    }));
  };

  return (
    <DataFlowContext.Provider value={{ 
      dataFlow, 
      setSource, 
      setData, 
      setDestination, 
      resetFlow,
      addToJourney
    }}>
      {children}
    </DataFlowContext.Provider>
  );
};

export const useDataFlow = () => {
  const context = useContext(DataFlowContext);
  if (context === undefined) {
    throw new Error('useDataFlow must be used within a DataFlowProvider');
  }
  return context;
};
```

### Step 2: Integrate the Context Provider in App

Now, let's add this provider to the main App component:

```tsx
// frontend/src/App.tsx

import { DataFlowProvider } from './contexts/DataFlowContext';

function App() {
  return (
    <AuthProvider>
      <DataFlowProvider>
        {/* Rest of your app */}
        <Router>
          <Layout>
            <Routes>
              {/* Your routes */}
            </Routes>
          </Layout>
        </Router>
      </DataFlowProvider>
    </AuthProvider>
  );
}
```

### Step 3: Create a Visual Flow Indicator Component

Let's create a component to visualize the data flow:

```tsx
// frontend/src/components/common/DataFlowIndicator.tsx

import React from 'react';
import { useDataFlow } from '../../contexts/DataFlowContext';
import { useLocation } from 'react-router-dom';

const DataFlowIndicator: React.FC = () => {
  const { dataFlow } = useDataFlow();
  const location = useLocation();
  
  // Determine current section based on URL
  const getCurrentSection = () => {
    if (location.pathname.includes('/chat')) return 'chat';
    if (location.pathname.includes('/data')) return 'data';
    if (location.pathname.includes('/sports')) return 'sportsdb';
    if (location.pathname.includes('/export')) return 'export';
    return '';
  };
  
  const currentSection = getCurrentSection();
  
  return (
    <div className="data-flow-indicator">
      <div className="flow-steps">
        <div className={`flow-step ${currentSection === 'chat' ? 'active' : ''} ${dataFlow.dataJourney.some(j => j.type === 'chat') ? 'visited' : ''}`}>
          Chat
        </div>
        <div className="flow-arrow">→</div>
        <div className={`flow-step ${currentSection === 'data' ? 'active' : ''} ${dataFlow.currentDestination === 'data' || dataFlow.dataJourney.some(j => j.type === 'data') ? 'visited' : ''}`}>
          Data
        </div>
        <div className="flow-arrow">→</div>
        <div className={`flow-step ${currentSection === 'sportsdb' ? 'active' : ''} ${dataFlow.currentDestination === 'sportsdb' ? 'visited' : ''}`}>
          Sports DB
        </div>
        <div className="flow-arrow">→</div>
        <div className={`flow-step ${currentSection === 'export' ? 'active' : ''} ${dataFlow.currentDestination === 'export' ? 'visited' : ''}`}>
          Export
        </div>
      </div>
      
      {dataFlow.currentSource && (
        <div className="source-info">
          Source: {dataFlow.currentSource.description}
        </div>
      )}
    </div>
  );
};

export default DataFlowIndicator;
```

### Step 4: Add Styling for the Flow Indicator

```css
/* frontend/src/styles/dataFlow.css */

.data-flow-indicator {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.flow-steps {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.flow-step {
  padding: 8px 16px;
  border-radius: 4px;
  background-color: #e9ecef;
  font-weight: 500;
  color: #495057;
}

.flow-step.active {
  background-color: #007bff;
  color: white;
}

.flow-step.visited {
  background-color: #28a745;
  color: white;
}

.flow-arrow {
  color: #6c757d;
  font-size: 18px;
}

.source-info {
  margin-top: 8px;
  font-size: 14px;
  color: #6c757d;
}
```

## Phase 2: Enhance Layout and Navigation

### Step 5: Update the Layout Component

Now, let's modify the Layout component to include our flow indicator:

```tsx
// frontend/src/components/Layout.tsx

import React from 'react';
import Navbar from './Navbar';
import DataFlowIndicator from './common/DataFlowIndicator';
import { useLocation } from 'react-router-dom';
import '../styles/dataFlow.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  
  // Only show flow indicator on main app pages
  const showFlowIndicator = 
    location.pathname.includes('/chat') || 
    location.pathname.includes('/data') || 
    location.pathname.includes('/sports') || 
    location.pathname.includes('/export');
  
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        {showFlowIndicator && <DataFlowIndicator />}
        {children}
      </main>
    </div>
  );
};

export default Layout;
```

### Step 6: Create Smart Breadcrumbs Component

Let's create breadcrumbs that show the data journey:

```tsx
// frontend/src/components/common/SmartBreadcrumbs.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import { useDataFlow } from '../../contexts/DataFlowContext';

const SmartBreadcrumbs: React.FC = () => {
  const { dataFlow } = useDataFlow();
  
  if (dataFlow.dataJourney.length === 0) {
    return null; // Don't show breadcrumbs if there's no journey
  }
  
  return (
    <nav aria-label="breadcrumb">
      <ol className="breadcrumb">
        {dataFlow.dataJourney.map((source, index) => {
          let url = '/';
          let label = '';
          
          switch (source.type) {
            case 'chat':
              url = `/chat/${source.id}`;
              label = `Chat: ${source.description}`;
              break;
            case 'data':
              url = `/data`;
              label = `Data: ${source.description}`;
              break;
            case 'manual':
              label = `Manual: ${source.description}`;
              break;
            case 'import':
              label = `Import: ${source.description}`;
              break;
          }
          
          return (
            <li key={index} className="breadcrumb-item">
              {index < dataFlow.dataJourney.length - 1 ? (
                <Link to={url}>{label}</Link>
              ) : (
                <span>{label}</span>
              )}
            </li>
          );
        })}
        
        {dataFlow.currentDestination && (
          <li className="breadcrumb-item active">
            {dataFlow.currentDestination === 'data' && 'Data Management'}
            {dataFlow.currentDestination === 'sportsdb' && 'Sports Database'}
            {dataFlow.currentDestination === 'export' && 'Export'}
          </li>
        )}
      </ol>
    </nav>
  );
};

export default SmartBreadcrumbs;
```

### Step 7: Add Breadcrumbs to Layout

Update the Layout component to include breadcrumbs:

```tsx
// frontend/src/components/Layout.tsx (updated)

import React from 'react';
import Navbar from './Navbar';
import DataFlowIndicator from './common/DataFlowIndicator';
import SmartBreadcrumbs from './common/SmartBreadcrumbs';
import { useLocation } from 'react-router-dom';
import '../styles/dataFlow.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  
  // Only show flow indicator and breadcrumbs on main app pages
  const showNavHelpers = 
    location.pathname.includes('/chat') || 
    location.pathname.includes('/data') || 
    location.pathname.includes('/sports') || 
    location.pathname.includes('/export');
  
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        {showNavHelpers && (
          <div className="navigation-helpers">
            <DataFlowIndicator />
            <SmartBreadcrumbs />
          </div>
        )}
        {children}
      </main>
    </div>
  );
};

export default Layout;
```

## Phase 3: Enhance Chat to Data Integration

### Step 8: Update the "Send to Data" Functionality

Let's enhance the "Send to Data" button in the MessageItem component:

```tsx
// frontend/src/components/chat/MessageItem.tsx (partial update)

import { useDataFlow } from '../../contexts/DataFlowContext';
import { useNavigate } from 'react-router-dom';

// Inside your MessageItem component
const MessageItem: React.FC<MessageItemProps> = ({ message, conversationId }) => {
  const { setSource, setData, setDestination, addToJourney } = useDataFlow();
  const navigate = useNavigate();
  
  // ... existing code
  
  const handleSendToData = async () => {
    try {
      setIsLoading(true);
      
      // Create a data source object
      const source = {
        type: 'chat' as const,
        id: message.id,
        timestamp: new Date(),
        description: `Message from ${new Date(message.timestamp).toLocaleString()}`
      };
      
      // Update data flow context
      setSource(source);
      setData(message.content);
      setDestination('data');
      addToJourney(source);
      
      // Existing code to extract and send data
      const extractedData = await dataExtractionService.extractStructuredData(message.content);
      // ... rest of your existing code
      
      // Navigate to data page
      navigate('/data');
    } catch (error) {
      console.error('Error sending to data:', error);
      setError('Failed to send data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // ... rest of component
};
```

### Step 9: Create a Data Preview Component

Let's create a component to preview data before sending it to the Data Management section:

```tsx
// frontend/src/components/chat/DataPreviewModal.tsx

import React from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';

interface DataPreviewModalProps {
  show: boolean;
  onHide: () => void;
  data: any;
  isLoading: boolean;
  error: string | null;
  onConfirm: () => void;
}

const DataPreviewModal: React.FC<DataPreviewModalProps> = ({
  show,
  onHide,
  data,
  isLoading,
  error,
  onConfirm
}) => {
  // Function to render a preview based on data type
  const renderPreview = () => {
    if (!data) return <p>No data to preview</p>;
    
    if (Array.isArray(data)) {
      // Render table for array data
      return (
        <div className="table-responsive">
          <table className="table table-sm">
            <thead>
              <tr>
                {Object.keys(data[0] || {}).map(key => (
                  <th key={key}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 5).map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((value, j) => (
                    <td key={j}>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.length > 5 && <p className="text-muted">Showing 5 of {data.length} rows</p>}
        </div>
      );
    }
    
    // For object data
    return (
      <div className="json-preview">
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    );
  };
  
  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Data Preview</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isLoading ? (
          <div className="text-center p-4">
            <Spinner animation="border" />
            <p className="mt-2">Processing data...</p>
          </div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : (
          <>
            <p>Review the extracted data before sending to Data Management:</p>
            {renderPreview()}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={onConfirm}
          disabled={isLoading || !!error || !data}
        >
          Send to Data Management
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DataPreviewModal;
```

### Step 10: Integrate the Preview Modal in MessageItem

Now, let's update the MessageItem to use our preview modal:

```tsx
// frontend/src/components/chat/MessageItem.tsx (updated)

import React, { useState } from 'react';
import DataPreviewModal from './DataPreviewModal';
// ... other imports

const MessageItem: React.FC<MessageItemProps> = ({ message, conversationId }) => {
  // ... existing state
  const [showPreview, setShowPreview] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  
  // ... existing code
  
  const handleSendToDataClick = async () => {
    try {
      setIsLoading(true);
      
      // Extract data but don't send it yet
      const data = await dataExtractionService.extractStructuredData(message.content);
      setExtractedData(data);
      
      // Show preview modal
      setShowPreview(true);
    } catch (error) {
      console.error('Error extracting data:', error);
      setError('Failed to extract data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleConfirmSendToData = async () => {
    try {
      setIsLoading(true);
      
      // Create a data source object
      const source = {
        type: 'chat' as const,
        id: message.id,
        timestamp: new Date(),
        description: `Message from ${new Date(message.timestamp).toLocaleString()}`
      };
      
      // Update data flow context
      setSource(source);
      setData(extractedData);
      setDestination('data');
      addToJourney(source);
      
      // Send the extracted data to the backend
      // ... your existing code to send data to backend
      
      // Hide modal and navigate
      setShowPreview(false);
      navigate('/data');
    } catch (error) {
      console.error('Error sending to data:', error);
      setError('Failed to send data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className={`message-item ${message.role}`}>
      {/* ... existing message rendering code */}
      
      {canExtractData && (
        <Button 
          variant="outline-primary" 
          size="sm" 
          onClick={handleSendToDataClick}
          disabled={isLoading}
        >
          {isLoading ? <Spinner size="sm" /> : 'Send to Data'}
        </Button>
      )}
      
      {error && <div className="text-danger mt-2">{error}</div>}
      
      <DataPreviewModal
        show={showPreview}
        onHide={() => setShowPreview(false)}
        data={extractedData}
        isLoading={isLoading}
        error={error}
        onConfirm={handleConfirmSendToData}
      />
    </div>
  );
};
```

## Phase 4: Data to Sports Database Integration

### Step 11: Create a Data Mapping Component

Let's create a component to map data to sports entities:

```tsx
// frontend/src/components/data/DataMappingModal.tsx

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import { useDataFlow } from '../../contexts/DataFlowContext';

interface EntityField {
  name: string;
  type: string;
  required: boolean;
}

interface EntityType {
  name: string;
  fields: EntityField[];
}

interface DataMappingModalProps {
  show: boolean;
  onHide: () => void;
  data: any[];
  onConfirm: (entityType: string, mappings: Record<string, string>) => void;
}

const DataMappingModal: React.FC<DataMappingModalProps> = ({
  show,
  onHide,
  data,
  onConfirm
}) => {
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [selectedEntityType, setSelectedEntityType] = useState<string>('');
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Get data columns
  const dataColumns = data.length > 0 ? Object.keys(data[0]) : [];
  
  // Fetch entity types on mount
  useEffect(() => {
    const fetchEntityTypes = async () => {
      try {
        setIsLoading(true);
        // This would be an API call to get entity types and their fields
        // For now, we'll use mock data
        const mockEntityTypes: EntityType[] = [
          {
            name: 'league',
            fields: [
              { name: 'name', type: 'string', required: true },
              { name: 'sport', type: 'string', required: true },
              { name: 'country', type: 'string', required: false },
            ]
          },
          {
            name: 'team',
            fields: [
              { name: 'name', type: 'string', required: true },
              { name: 'league_id', type: 'uuid', required: true },
              { name: 'city', type: 'string', required: false },
            ]
          },
          // Add more entity types as needed
        ];
        
        setEntityTypes(mockEntityTypes);
      } catch (error) {
        console.error('Error fetching entity types:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (show) {
      fetchEntityTypes();
    }
  }, [show]);
  
  // Update mappings when entity type changes
  useEffect(() => {
    if (selectedEntityType) {
      const entityType = entityTypes.find(et => et.name === selectedEntityType);
      if (entityType) {
        // Initialize mappings with empty values
        const initialMappings: Record<string, string> = {};
        entityType.fields.forEach(field => {
          initialMappings[field.name] = '';
        });
        setMappings(initialMappings);
        
        // Try to auto-map fields based on name similarity
        const autoMappings: Record<string, string> = { ...initialMappings };
        entityType.fields.forEach(field => {
          const matchingColumn = dataColumns.find(col => 
            col.toLowerCase() === field.name.toLowerCase() ||
            col.toLowerCase().includes(field.name.toLowerCase())
          );
          if (matchingColumn) {
            autoMappings[field.name] = matchingColumn;
          }
        });
        setMappings(autoMappings);
      }
    }
  }, [selectedEntityType, entityTypes, dataColumns]);
  
  const handleEntityTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEntityType(e.target.value);
  };
  
  const handleMappingChange = (fieldName: string, columnName: string) => {
    setMappings(prev => ({
      ...prev,
      [fieldName]: columnName
    }));
  };
  
  const handleConfirm = () => {
    onConfirm(selectedEntityType, mappings);
  };
  
  // Get current entity fields
  const currentEntityFields = selectedEntityType 
    ? entityTypes.find(et => et.name === selectedEntityType)?.fields || []
    : [];
  
  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Map Data to Sports Entity</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isLoading ? (
          <div className="text-center p-4">
            <Spinner animation="border" />
            <p className="mt-2">Loading entity types...</p>
          </div>
        ) : (
          <>
            <Form.Group className="mb-3">
              <Form.Label>Select Entity Type</Form.Label>
              <Form.Select 
                value={selectedEntityType} 
                onChange={handleEntityTypeChange}
              >
                <option value="">Select an entity type</option>
                {entityTypes.map(et => (
                  <option key={et.name} value={et.name}>
                    {et.name.charAt(0).toUpperCase() + et.name.slice(1)}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            
            {selectedEntityType && (
              <>
                <h5>Map Fields to Data Columns</h5>
                <p className="text-muted">
                  Select which data column corresponds to each entity field
                </p>
                
                {currentEntityFields.map(field => (
                  <Form.Group key={field.name} className="mb-3">
                    <Form.Label>
                      {field.name} {field.required && <span className="text-danger">*</span>}
                    </Form.Label>
                    <Form.Select
                      value={mappings[field.name] || ''}
                      onChange={(e) => handleMappingChange(field.name, e.target.value)}
                    >
                      <option value="">Select a column</option>
                      {dataColumns.map(column => (
                        <option key={column} value={column}>
                          {column}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                ))}
                
                <div className="data-preview mt-4">
                  <h5>Data Preview (First Row)</h5>
                  {data.length > 0 && (
                    <pre>{JSON.stringify(data[0], null, 2)}</pre>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleConfirm}
          disabled={!selectedEntityType || isLoading}
        >
          Create Entities
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DataMappingModal;
```

### Step 12: Add "Create Sports Entities" Button to DataTable

Now, let's update the DataTable component to include a button for creating sports entities:

```tsx
// frontend/src/components/data/DataTable.tsx (partial update)

import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import DataMappingModal from './DataMappingModal';
import { useDataFlow } from '../../contexts/DataFlowContext';
import SportsDatabaseService from '../../services/SportsDatabaseService';

// Inside your DataTable component
const DataTable: React.FC<DataTableProps> = ({ /* existing props */ }) => {
  // ... existing state and code
  const [showMappingModal, setShowMappingModal] = useState(false);
  const { setSource, setData, setDestination, addToJourney } = useDataFlow();
  const navigate = useNavigate();
  const sportsDatabaseService = new SportsDatabaseService();
  
  // ... existing code
  
  const handleCreateSportsEntities = () => {
    // Only show mapping modal if we have data
    if (rows.length > 0) {
      setShowMappingModal(true);
    }
  };
  
  const handleConfirmMapping = async (entityType: string, mappings: Record<string, string>) => {
    try {
      // Create entities from mapped data
      const entities = rows.map(row => {
        const entity: Record<string, any> = {};
        Object.entries(mappings).forEach(([fieldName, columnName]) => {
          if (columnName) {
            entity[fieldName] = row[columnName];
          }
        });
        return entity;
      });
      
      // Create a data source object
      const source = {
        type: 'data' as const,
        id: structuredDataId,
        timestamp: new Date(),
        description: `Data: ${title || 'Untitled'}`
      };
      
      // Update data flow context
      setSource(source);
      setData(entities);
      setDestination('sportsdb');
      addToJourney(source);
      
      // Create entities in the backend
      await sportsDatabaseService.createEntities(entityType, entities);
      
      // Hide modal and navigate to sports database
      setShowMappingModal(false);
      navigate('/sports');
      
      // Show success message
      // ... your success notification code
    } catch (error) {
      console.error('Error creating entities:', error);
      // Show error message
      // ... your error notification code
    }
  };
  
  return (
    <div className="data-table-container">
      {/* ... existing toolbar */}
      <div className="data-table-toolbar">
        {/* ... existing buttons */}
        <Button 
          variant="outline-primary"
          onClick={handleCreateSportsEntities}
          disabled={rows.length === 0}
        >
          Create Sports Entities
        </Button>
      </div>
      
      {/* ... existing table rendering code */}
      
      <DataMappingModal
        show={showMappingModal}
        onHide={() => setShowMappingModal(false)}
        data={rows}
        onConfirm={handleConfirmMapping}
      />
    </div>
  );
};
``` 