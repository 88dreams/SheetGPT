# SportDataMapper Component

## Overview

The SportDataMapper component is a specialized tool for mapping structured data to sports database entities. It provides a user interface for:

- Selecting an entity type (team, player, league, etc.)
- Mapping source fields to entity fields using drag-and-drop
- Navigating through records
- Excluding specific records from import
- Saving mapped data to the database
- Batch importing multiple records

## Component Architecture

The SportDataMapper follows a modular architecture with the following components:

### Main Components

- **SportDataMapper**: A wrapper component that provides the entry point to the mapping tool
- **SportDataMapperContainer**: The main container component that orchestrates all functionality

### UI Components

- **FieldItem**: Represents a draggable/droppable field in the UI
- **FieldHelpTooltip**: Provides contextual help for different field types
- **GuidedWalkthrough**: Provides step-by-step guidance for users
- **EntityTypeSelector**: Allows users to select the entity type for mapping
- **ViewModeSelector**: Toggles between entity and global view modes
- **RecordNavigation**: Provides controls for navigating between records
- **FieldMappingArea**: Contains the drag-and-drop interface for field mapping
- **GlobalMappingView**: Provides an overview of all entity types and their mappings
- **ActionButtons**: Contains buttons for saving, batch importing, and closing
- **Notification**: Displays error messages and other notifications

### Custom Hooks

- **useFieldMapping**: Manages field mapping functionality
- **useRecordNavigation**: Handles record navigation and exclusion
- **useImportProcess**: Manages database saving and batch import operations
- **useUiState**: Manages UI state like view mode, guided walkthrough, and field help
- **useDataManagement**: Manages data operations like extraction and transformation

### Utility Modules

- **entityTypes.ts**: Defines entity types and their required fields
- **entityDetection.ts**: Logic for detecting entity types from data
- **validationUtils.ts**: Validation logic for different entity types
- **mappingUtils.ts**: Functions for mapping fields and data transformation
- **uiUtils.ts**: UI-related helper functions

## Usage

```tsx
import { SportDataMapper } from '../components/data';

// In your component
const [isOpen, setIsOpen] = useState(false);
const [structuredData, setStructuredData] = useState(null);

// Open the SportDataMapper with structured data
const handleOpenMapper = (data) => {
  setStructuredData(data);
  setIsOpen(true);
};

// Close the SportDataMapper
const handleCloseMapper = () => {
  setIsOpen(false);
};

// Render the SportDataMapper
return (
  <>
    <button onClick={() => handleOpenMapper(yourData)}>Map Sports Data</button>
    
    <SportDataMapper
      isOpen={isOpen}
      onClose={handleCloseMapper}
      structuredData={structuredData}
    />
  </>
);
```

## Data Flow

1. User provides structured data to the SportDataMapper
2. Component extracts source fields and values from the data
3. Component recommends entity type based on source fields and values
4. User selects entity type (team, player, league, etc.)
5. User maps source fields to entity fields using drag-and-drop
6. User navigates through records using navigation controls
7. User can exclude specific records from import
8. User saves mapped data to database (single record or batch import)

## Key Features

### Automatic Entity Type Detection

The component analyzes source data to recommend the most likely entity type based on field names and values.

### Drag-and-Drop Field Mapping

Intuitive interface for mapping fields with visual feedback.

### Field Validation

Validates required fields and data formats before saving to the database.

### Batch Import

Efficiently imports multiple records of the same entity type with progress tracking.

### Guided Walkthrough

Step-by-step guidance for first-time users to understand the mapping process.

### Field Help

Contextual help for understanding field requirements and data formats.

## Testing

The component includes comprehensive tests for all aspects of functionality:

- Component rendering tests
- Hook functionality tests
- Utility function tests
- Integration tests for the complete workflow

Run tests with:

```bash
npm test -- --testPathPattern=SportDataMapper
```

## Refactoring Notes

The SportDataMapper component has been refactored from a monolithic component to a modular architecture with:

1. Smaller, focused components
2. Custom hooks for state management
3. Utility modules for different functionalities
4. Comprehensive test coverage

This refactoring improves:

- Code maintainability
- Testability
- Reusability
- Performance
- Developer experience

## SportDataMapperContainer Component

The SportDataMapperContainer component is the core component of the SportDataMapper system, responsible for orchestrating the data mapping process. It has been completely refactored to utilize a modular architecture with smaller, focused components and custom hooks.

### Component Structure

```typescript
const SportDataMapperContainer: React.FC<SportDataMapperContainerProps> = ({
  data,
  onClose,
  onSaveComplete,
  initialEntityType,
  showGuidedWalkthrough = false,
}) => {
  // State management using custom hooks
  const {
    fieldMappings,
    targetFields,
    updateFieldMappings,
    resetFieldMappings,
    validateMappings,
    // ... other field mapping functions
  } = useFieldMapping();
  
  const {
    currentIndex,
    totalRecords,
    excludedRecords,
    navigateToRecord,
    toggleExcludeRecord,
    // ... other navigation functions
  } = useRecordNavigation();
  
  const {
    isSaving,
    saveProgress,
    saveToDatabase,
    batchImport,
    // ... other import functions
  } = useImportProcess();
  
  const {
    viewMode,
    setViewMode,
    showFieldHelp,
    toggleFieldHelp,
    // ... other UI state functions
  } = useUiState();
  
  const {
    sourceFields,
    sourceFieldValues,
    dataToImport,
    isDataValid,
    updateSourceFieldValues,
    // ... other data management functions
  } = useDataManagement();
  
  // Local state
  const [suggestedEntityType, setSuggestedEntityType] = useState<string | null>(null);
  
  // Component logic and rendering
  // ...
};
```

### Component Rendering

```tsx
return (
  <div className="sport-data-mapper-container">
    {/* Header section with entity type selector and view mode controls */}
    <div className="header-section">
      <EntityTypeSelector 
        selectedEntityType={selectedEntityType}
        onEntityTypeChange={handleEntityTypeChange}
        suggestedEntityType={suggestedEntityType}
      />
      <ViewModeSelector 
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
    </div>
    
    {/* Record navigation controls */}
    <RecordNavigation 
      currentIndex={currentIndex}
      totalRecords={totalRecords}
      excludedRecords={excludedRecords}
      onNavigate={navigateToRecord}
      onToggleExclude={toggleExcludeRecord}
    />
    
    {/* Main content area - conditional rendering based on viewMode */}
    {viewMode === 'entity' ? (
      <FieldMappingArea 
        sourceFields={sourceFields}
        targetFields={targetFields}
        fieldMappings={fieldMappings}
        onUpdateMappings={updateFieldMappings}
        showFieldHelp={showFieldHelp}
        onToggleFieldHelp={toggleFieldHelp}
      />
    ) : (
      <GlobalMappingView 
        sourceFields={sourceFields}
        fieldMappings={fieldMappings}
        entityTypes={ENTITY_TYPES}
        selectedEntityType={selectedEntityType}
      />
    )}
    
    {/* Action buttons */}
    <ActionButtons 
      onSave={() => saveToDatabase(selectedEntityType, fieldMappings, sourceFieldValues)}
      onBatchImport={() => batchImport(selectedEntityType, fieldMappings, dataToImport, excludedRecords)}
      onClose={onClose}
      isSaving={isSaving}
      saveProgress={saveProgress}
    />
    
    {/* Notifications and guided walkthrough */}
    <Notification show={!isDataValid} message="Invalid data format detected. Please check your data." />
    {showGuidedWalkthrough && (
      <GuidedWalkthrough onClose={() => setShowGuidedWalkthrough(false)} />
    )}
  </div>
);
```

### Key Improvements

- **Modular Component Imports**: Utilizes smaller, focused components for better maintainability
- **Custom Hooks for State Management**: Separates concerns using specialized hooks for different aspects of functionality
- **Improved Error Handling**: Provides clear error messages and notifications for invalid data formats
- **Enhanced Conditional Rendering**: Uses viewMode to determine which components to display
- **Better Data Flow**: Implements clear data flow between components with proper prop passing
- **Comprehensive Data Validation**: Validates data format and structure before processing
- **Intelligent Entity Type Detection**: Analyzes source fields to suggest the most appropriate entity type
- **Robust Record Navigation**: Manages navigation between records with proper state updates
- **Efficient Batch Import Process**: Orchestrates the batch import process with progress tracking

### Data Processing Logic

- **Entity Type Detection**: Analyzes source fields to suggest the most appropriate entity type
- **Data Validation**: Validates data format and structure before processing
- **Field Mapping Management**: Handles creation and updates of field mappings
- **Record Navigation**: Manages navigation between records with proper state updates
- **Batch Import Process**: Orchestrates the batch import process with progress tracking

### Error Handling and Edge Cases

- **Invalid Data Format**: Detects and notifies users of invalid data formats
- **Missing Required Fields**: Validates required fields before saving
- **Empty Data**: Handles empty data sets gracefully
- **Navigation Boundaries**: Prevents navigation beyond the first or last record
- **Import Failures**: Provides detailed error messages for import failures

## Usage

```tsx
import { SportDataMapperContainer } from '../components/data';

// In your component
const [isOpen, setIsOpen] = useState(false);
const [structuredData, setStructuredData] = useState(null);

// Open the SportDataMapper with structured data
const handleOpenMapper = (data) => {
  setStructuredData(data);
  setIsOpen(true);
};

// Close the SportDataMapper
const handleCloseMapper = () => {
  setIsOpen(false);
};

// Render the SportDataMapper
return (
  <>
    <button onClick={() => handleOpenMapper(yourData)}>Map Sports Data</button>
    
    <SportDataMapperContainer
      isOpen={isOpen}
      onClose={handleCloseMapper}
      structuredData={structuredData}
    />
  </>
);
``` 