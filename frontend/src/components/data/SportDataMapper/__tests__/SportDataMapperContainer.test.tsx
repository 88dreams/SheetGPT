import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import SportDataMapperContainer from '../SportDataMapperContainer';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
// Import the interface directly from the file
import useImportProcess from '../hooks/useImportProcess';

// Import the ImportResults interface
import { ImportResults } from '../hooks/useImportProcess';

// Define the interfaces needed for mocking
interface NotificationType {
  type: 'success' | 'error' | 'info';
  message: string;
}

// Mock the hooks
jest.mock('../hooks/useFieldMapping', () => ({
  __esModule: true,
  default: () => ({
    mappingsByEntityType: {},
    selectedEntityType: 'team',
    setSelectedEntityType: jest.fn(),
    handleFieldMapping: jest.fn(),
    clearMappings: jest.fn(),
    removeMapping: jest.fn(),
    getCurrentMappings: jest.fn().mockReturnValue({})
  })
}));

jest.mock('../hooks/useRecordNavigation', () => ({
  __esModule: true,
  default: () => ({
    currentRecordIndex: 0,
    setCurrentRecordIndex: jest.fn(),
    excludedRecords: new Set(),
    totalRecords: 3,
    includedRecordsCount: 3,
    goToNextRecord: jest.fn(),
    goToPreviousRecord: jest.fn(),
    toggleExcludeRecord: jest.fn(),
    isCurrentRecordExcluded: jest.fn().mockReturnValue(false),
    getCurrentRecord: jest.fn().mockReturnValue({ name: 'Test Record' }),
    getIncludedRecords: jest.fn().mockReturnValue([{ name: 'Test Record' }])
  })
}));

jest.mock('../hooks/useImportProcess', () => ({
  __esModule: true,
  default: () => ({
    isSaving: false,
    isBatchImporting: false,
    importResults: null,
    notification: null,
    showNotification: jest.fn(),
    // @ts-ignore
    saveToDatabase: jest.fn().mockResolvedValue({ success: true }),
    // @ts-ignore
    batchImport: jest.fn().mockResolvedValue({ success: 1, failed: 0, total: 1 })
  })
}));

jest.mock('../hooks/useUiState', () => ({
  __esModule: true,
  default: () => ({
    viewMode: 'entity',
    showGuidedWalkthrough: false,
    guidedStep: 1,
    showFieldHelp: null,
    validStructuredData: true,
    setViewMode: jest.fn(),
    setShowGuidedWalkthrough: jest.fn(),
    setGuidedStep: jest.fn(),
    setShowFieldHelp: jest.fn(),
    setValidStructuredData: jest.fn(),
    toggleViewMode: jest.fn(),
    startGuidedWalkthrough: jest.fn(),
    endGuidedWalkthrough: jest.fn(),
    nextGuidedStep: jest.fn(),
    previousGuidedStep: jest.fn(),
    showHelpForField: jest.fn(),
    hideFieldHelp: jest.fn(),
    setDataValidity: jest.fn()
  })
}));

jest.mock('../hooks/useDataManagement', () => ({
  __esModule: true,
  default: () => ({
    dataToImport: [{ name: 'Test Record' }],
    sourceFields: ['name', 'city'],
    sourceFieldValues: { name: 'Test Record', city: 'Test City' },
    mappedData: { name: 'Test Record' },
    setDataToImport: jest.fn(),
    setSourceFields: jest.fn(),
    setSourceFieldValues: jest.fn(),
    setMappedData: jest.fn(),
    extractSourceFields: jest.fn(),
    updateMappedDataForEntityType: jest.fn(),
    updateSourceFieldValues: jest.fn(),
    updateMappedDataForField: jest.fn(),
    clearMappedData: jest.fn()
  })
}));

// Mock the sportDataMapper utilities
jest.mock('../../../../utils/sportDataMapper', () => ({
  EntityType: {},
  ENTITY_TYPES: [
    { id: 'team', name: 'Team', description: 'Sports teams', requiredFields: ['name'] }
  ],
  detectEntityType: jest.fn().mockReturnValue('team'),
  getRequiredFields: jest.fn().mockReturnValue(['name']),
  validateEntityData: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
  getEntityTypeDisplayName: jest.fn().mockReturnValue('Team'),
  getEntityTypeColorClass: jest.fn().mockReturnValue('bg-blue-100'),
  getEntityTypeBorderClass: jest.fn().mockReturnValue('border-blue-300'),
  getFieldMappingStatusClass: jest.fn().mockReturnValue('bg-green-100')
}));

// Wrap component with DndProvider for testing
const renderWithDnd = (ui: React.ReactElement) => {
  return render(
    <DndProvider backend={HTML5Backend}>
      {ui}
    </DndProvider>
  );
};

describe('SportDataMapperContainer', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    structuredData: [{ name: 'Test Record', city: 'Test City' }]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the component when open', () => {
    renderWithDnd(<SportDataMapperContainer {...mockProps} />);
    
    // Check if the modal is rendered
    expect(screen.getByText('Sports Data Mapper')).toBeInTheDocument();
  });
  
  it('should not render when closed', () => {
    renderWithDnd(<SportDataMapperContainer {...{ ...mockProps, isOpen: false }} />);
    
    // Modal should not be in the document
    expect(screen.queryByText('Sports Data Mapper')).not.toBeInTheDocument();
  });
  
  it('should display entity type selection', () => {
    renderWithDnd(<SportDataMapperContainer {...mockProps} />);
    
    // Check if entity type selection is displayed
    expect(screen.getByText('Select Entity Type')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
  });
  
  it('should display source fields', () => {
    renderWithDnd(<SportDataMapperContainer {...mockProps} />);
    
    // Check if source fields are displayed
    expect(screen.getByText('Source Fields')).toBeInTheDocument();
    // Use getAllByText and check the first occurrence for 'name'
    const nameElements = screen.getAllByText(/name/i);
    expect(nameElements.length).toBeGreaterThan(0);
    expect(screen.getByText('city')).toBeInTheDocument();
  });
  
  it('should display database fields', () => {
    renderWithDnd(<SportDataMapperContainer {...mockProps} />);
    
    // Check if database fields are displayed
    expect(screen.getByText(/Database Fields/i)).toBeInTheDocument();
  });
  
  it('should display record navigation', () => {
    renderWithDnd(<SportDataMapperContainer {...mockProps} />);
    
    // Check if record navigation is displayed - use a more specific selector
    const recordNavElement = screen.getByText((content, element) => {
      // Look for the h3 element that contains "Record"
      return element?.tagName.toLowerCase() === 'h3' && 
             element?.textContent?.includes('Record') || false;
    });
    expect(recordNavElement).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });
  
  it('should call onClose when close button is clicked', () => {
    renderWithDnd(<SportDataMapperContainer {...mockProps} />);
    
    // Find the close button by its position in the header
    const closeButtons = screen.getAllByRole('button', { name: '' });
    // The first button with no name should be the close button in the header
    const closeButton = closeButtons[0];
    fireEvent.click(closeButton);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });
}); 