import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { EntityType } from '../../../../utils/sportDataMapper/entityTypes';
import { 
  EntityTypeSelector, 
  FieldMappingArea, 
  ActionButtons 
} from './';

interface EntityViewProps {
  selectedEntityType: EntityType | null;
  onEntityTypeSelect: (entityType: EntityType) => void;
  suggestedEntityType: EntityType | null;
  leagueAndStadiumExist: boolean;
  isUpdateMode: boolean;
  setIsUpdateMode: (updateMode: boolean) => void;
  sourceFields: string[];
  sourceFieldValues: Record<string, any>;
  mappingsByEntityType: Record<string, Record<string, string>>;
  showFieldHelp: string | null;
  onFieldMapping: (sourceField: string, targetField: string) => void;
  onRemoveMapping: (targetField: string) => void;
  onShowFieldHelp: (field: string) => void;
  onHideFieldHelp: () => void;
  currentRecordIndex: number | null;
  totalRecords: number;
  onPreviousRecord: () => void;
  onNextRecord: () => void;
  onToggleExcludeRecord: () => void;
  isCurrentRecordExcluded: boolean;
  isSaving: boolean;
  isBatchImporting: boolean;
  onSaveToDatabase: () => void;
  onBatchImport: () => void;
  onSendToData?: () => void; // Optional callback for sending to data management
}

const EntityView: React.FC<EntityViewProps> = ({
  selectedEntityType,
  onEntityTypeSelect,
  suggestedEntityType,
  leagueAndStadiumExist,
  isUpdateMode,
  setIsUpdateMode,
  sourceFields,
  sourceFieldValues,
  mappingsByEntityType,
  showFieldHelp,
  onFieldMapping,
  onRemoveMapping,
  onShowFieldHelp,
  onHideFieldHelp,
  currentRecordIndex,
  totalRecords,
  onPreviousRecord,
  onNextRecord,
  onToggleExcludeRecord,
  isCurrentRecordExcluded,
  isSaving,
  isBatchImporting,
  onSaveToDatabase,
  onBatchImport,
  onSendToData
}) => {
  return (
    <div>
      {/* Entity Type Selector */}
      <EntityTypeSelector
        selectedEntityType={selectedEntityType}
        onEntityTypeSelect={onEntityTypeSelect}
        suggestedEntityType={suggestedEntityType}
        leagueAndStadiumExist={leagueAndStadiumExist}
      />
      
      {selectedEntityType && (
        <div>
          {/* Field Mapping Area */}
          <DndProvider backend={HTML5Backend}>
            <FieldMappingArea
              selectedEntityType={selectedEntityType}
              sourceFields={sourceFields}
              sourceFieldValues={sourceFieldValues}
              mappingsByEntityType={mappingsByEntityType}
              showFieldHelp={showFieldHelp}
              onFieldMapping={onFieldMapping}
              onRemoveMapping={onRemoveMapping}
              onShowFieldHelp={onShowFieldHelp}
              onHideFieldHelp={onHideFieldHelp}
              currentRecordIndex={currentRecordIndex}
              totalRecords={totalRecords}
              onPreviousRecord={onPreviousRecord}
              onNextRecord={onNextRecord}
              onToggleExcludeRecord={onToggleExcludeRecord}
              isCurrentRecordExcluded={isCurrentRecordExcluded}
            />
          </DndProvider>
          
          {/* Update Mode Toggle */}
          <div className="flex justify-end items-center mt-4 mb-2">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isUpdateMode}
                onChange={(e) => setIsUpdateMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-900">
                {isUpdateMode ? "Update Existing Records" : "Create New Records"}
              </span>
            </label>
          </div>
          
          {/* Action Buttons */}
          <ActionButtons
            selectedEntityType={selectedEntityType}
            isSaving={isSaving}
            isBatchImporting={isBatchImporting}
            onSaveToDatabase={onSaveToDatabase}
            onBatchImport={onBatchImport}
            onSendToData={onSendToData}
          />
        </div>
      )}
    </div>
  );
};

export default EntityView;