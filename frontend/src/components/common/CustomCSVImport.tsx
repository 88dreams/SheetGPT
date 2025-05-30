import React, { useState, useCallback, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { useApiClient } from '../../hooks/useApiClient';
import { useNotification } from '../../contexts/NotificationContext';
import { FaFileUpload, FaTrash, FaArrowsAltH, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { Select, Input, Checkbox, InputNumber, Button, Tooltip, Alert } from 'antd';
import { DndProvider, useDrag, useDrop, DragSourceMonitor, DropTargetMonitor } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface ImportStats {
  total_contacts_in_file: number;
  processed_rows: number;
  imported_contacts: number;
  updated_contacts: number;
  matched_brands_associated: number;
  import_errors: Array<{
    row_number?: number | string;
    original_row?: Record<string, string>;
    error: string;
    field?: string;
    value?: string;
  }>;
}

interface CustomCSVImportProps {
  onImportComplete: (stats: ImportStats) => void;
  initialFile?: File;
}

const ItemTypes = { CSV_HEADER: 'csvHeader' } as const;

interface DraggableItem {
  id: string;
  name: string;
  type: string; // Ensure type is part of DraggableItem if used in item: { type: ... }
}

interface TargetContactField {
  id: string;
  label: string;
  required: boolean;
  mappedSourceHeader: string | null;
}

const CONTACT_MODEL_FIELDS_CONFIG: Omit<TargetContactField, 'mappedSourceHeader'>[] = [
  { label: 'First Name', id: 'first_name', required: true },
  { label: 'Last Name', id: 'last_name', required: true },
  { label: 'Email', id: 'email', required: false },
  { label: 'LinkedIn URL', id: 'linkedin_url', required: false },
  { label: 'Company', id: 'company', required: false },
  { label: 'Position', id: 'position', required: false },
  { label: 'Connected On (Date)', id: 'connected_on', required: false },
  { label: 'Notes', id: 'notes', required: false },
];

// Interface for the expected response when a single contact is processed
interface ContactResponse { // Define a basic structure for the response
  id: string; // Assuming UUID is string on frontend
  first_name: string;
  last_name: string;
  // Add other fields if needed from backend's ContactResponse
}

const CustomCSVImport: React.FC<CustomCSVImportProps> = ({ onImportComplete, initialFile }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiClient = useApiClient();
  const { showNotification } = useNotification();

  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [csvSourceHeaders, setCsvSourceHeaders] = useState<string[]>([]);
  const [targetContactFields, setTargetContactFields] = useState<TargetContactField[]>(
    CONTACT_MODEL_FIELDS_CONFIG.map(f => ({ ...f, mappedSourceHeader: null }))
  );
  const [autoMatchBrands, setAutoMatchBrands] = useState(true);
  const [matchThreshold, setMatchThreshold] = useState(0.6);
  const [importSourceTag, setImportSourceTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<ImportStats | null>(null);
  const [sourceDataRows, setSourceDataRows] = useState<Record<string, string>[]>([]);
  const [currentRecordIndex, setCurrentRecordIndex] = useState<number | null>(null);
  const [currentSourceRecordValues, setCurrentSourceRecordValues] = useState<Record<string, string> | null>(null);

  const resetAllMappings = useCallback(() => {
    setTargetContactFields(CONTACT_MODEL_FIELDS_CONFIG.map(f => ({ ...f, mappedSourceHeader: null })));
  }, []);

  const resetState = useCallback(() => {
    setFile(null); setFileName(''); 
    setCsvSourceHeaders([]);
    resetAllMappings();
    setParsingError(null); setImportResults(null); setLoading(false);
    setSourceDataRows([]);
    setCurrentRecordIndex(null);
    setCurrentSourceRecordValues(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [resetAllMappings]);

  const processFile = useCallback((selectedFile: File) => {
    if (!selectedFile) { resetState(); return; }
    setParsingError(null); setImportResults(null); setFile(selectedFile); setFileName(selectedFile.name); setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) { 
          setParsingError("File is empty or could not be read."); 
          setCsvSourceHeaders([]); setSourceDataRows([]); setCurrentRecordIndex(null); setCurrentSourceRecordValues(null);
          setLoading(false); return; 
        }
        const lines = content.split(/\r\n|\n|\r/);
        let actualHeaderRowIndex = 0;
        const MAX_PREAMBLE_LINES = 5;
        let foundHeader = false;
        for (let i = 0; i < Math.min(lines.length, MAX_PREAMBLE_LINES); i++) {
          const lineToTest = lines[i];
          if (!lineToTest.trim()) continue;
          const parsedLine = Papa.parse(lineToTest, { header: false, delimiter: ",", preview: 1 });
          if (parsedLine.data && parsedLine.data.length > 0) {
            const fieldsInLine = (parsedLine.data[0] as string[]).filter(f => f.trim() !== "").length;
            if (fieldsInLine > 2 || i === Math.min(lines.length, MAX_PREAMBLE_LINES) - 1) {
              actualHeaderRowIndex = i; foundHeader = true; break;
            }
          }
        }
        if (!foundHeader && lines.length > 0) { actualHeaderRowIndex = 0; }
        else if (lines.length === 0) { 
            setParsingError("File is empty after attempting to find header."); 
            setCsvSourceHeaders([]); setSourceDataRows([]); setCurrentRecordIndex(null); setCurrentSourceRecordValues(null);
            setLoading(false); return; 
        }
        const csvDataString = lines.slice(actualHeaderRowIndex).join('\n');
        Papa.parse(csvDataString, {
          header: true, skipEmptyLines: true, delimiter: ",",
          complete: (results) => {
            if (results.errors && results.errors.length > 0) {
              setParsingError(`Error parsing CSV: ${results.errors[0].message} (Headers might be on row ${actualHeaderRowIndex + 1})`);
              setCsvSourceHeaders([]); setSourceDataRows([]); setCurrentRecordIndex(null); setCurrentSourceRecordValues(null);
            } else if (!results.meta.fields || results.meta.fields.length === 0) {
              setParsingError("Could not parse headers. (Checked from row " + (actualHeaderRowIndex + 1) + ").");
              setCsvSourceHeaders([]); setSourceDataRows([]);
            } else {
              const headers = results.meta.fields.map(h => h.trim()).filter(h => h);
              setCsvSourceHeaders(headers);
              setSourceDataRows(results.data as Record<string, string>[]);
              if (results.data.length > 0) {
                setCurrentRecordIndex(0);
                setCurrentSourceRecordValues(results.data[0] as Record<string, string>);
              } else {
                setCurrentRecordIndex(null); setCurrentSourceRecordValues(null);
                showNotification('info', 'CSV has headers but no data rows (after skipping preamble).');
              }
            }
            setLoading(false);
          },
          error: (error: Error) => {
            setParsingError(`Error reading or parsing CSV file: ${error.message}`);
            setCsvSourceHeaders([]); setSourceDataRows([]); setCurrentRecordIndex(null); setCurrentSourceRecordValues(null);
            setLoading(false);
          }
        });
      } catch (err: any) { 
        setParsingError(`Error processing file content: ${err.message}`); 
        setCsvSourceHeaders([]); setSourceDataRows([]); setCurrentRecordIndex(null); setCurrentSourceRecordValues(null);
        setLoading(false); 
      }
    };
    reader.onerror = () => { 
      setParsingError("Error reading the file itself."); 
      setCsvSourceHeaders([]); setSourceDataRows([]); setCurrentRecordIndex(null); setCurrentSourceRecordValues(null);
      setLoading(false); 
    };
    reader.readAsText(selectedFile);
  }, [resetState, showNotification]);
  
  useEffect(() => {
    if (csvSourceHeaders.length > 0 && sourceDataRows.length > 0) {
        const newTargetFields = CONTACT_MODEL_FIELDS_CONFIG.map(targetField => {
            const lowerTargetLabel = targetField.label.toLowerCase().replace(/\s+/g, '').replace(/\(date\)/g, '');
            const lowerTargetId = targetField.id.toLowerCase().replace(/\s+/g, '');
            let autoMappedSourceHeader: string | null = null;
            const matchingCsvHeader = csvSourceHeaders.find(csvHeader => {
                if (!csvHeader) return false;
                const lowerCsvHeader = csvHeader.toLowerCase().replace(/\s+/g, '');
          return lowerCsvHeader.includes(lowerTargetLabel) || lowerCsvHeader.includes(lowerTargetId) || lowerTargetLabel.includes(lowerCsvHeader);
            });
        if (matchingCsvHeader) { autoMappedSourceHeader = matchingCsvHeader; }
            return { ...targetField, mappedSourceHeader: autoMappedSourceHeader };
        });
        const usedCsvHeaders = new Set<string>();
        const finalTargetFields = newTargetFields.map(field => {
            if (field.mappedSourceHeader && usedCsvHeaders.has(field.mappedSourceHeader)) {
                return { ...field, mappedSourceHeader: null };
            }
        if (field.mappedSourceHeader) { usedCsvHeaders.add(field.mappedSourceHeader); }
            return field;
        });
        setTargetContactFields(finalTargetFields);
    } else {
        resetAllMappings();
    }
  }, [csvSourceHeaders, resetAllMappings, sourceDataRows]);

  useEffect(() => {
    if (initialFile && !file) { processFile(initialFile); }
  }, [initialFile, file, processFile]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) { processFile(selectedFile); } else { resetState(); }
  }, [processFile, resetState]);

  const handleDropHeaderOnField = useCallback((targetFieldId: string, sourceHeaderId: string) => {
    setTargetContactFields(prevFields =>
      prevFields.map(field => {
        if (field.mappedSourceHeader === sourceHeaderId && field.id !== targetFieldId) { return { ...field, mappedSourceHeader: null }; }
        if (field.id === targetFieldId) { return { ...field, mappedSourceHeader: sourceHeaderId }; }
        return field;
      })
    );
  }, []);

  const handleUnmapTargetField = useCallback((targetFieldId: string) => {
    setTargetContactFields(prevFields => prevFields.map(field => field.id === targetFieldId ? { ...field, mappedSourceHeader: null } : field));
  }, []);

  const unmappedCsvHeaders = csvSourceHeaders.filter(header => !targetContactFields.some(field => field.mappedSourceHeader === header));

  const goToNextRecord = useCallback(() => {
    if (currentRecordIndex !== null && currentRecordIndex < sourceDataRows.length - 1) {
      const nextIndex = currentRecordIndex + 1;
      setCurrentRecordIndex(nextIndex);
      setCurrentSourceRecordValues(sourceDataRows[nextIndex]);
    }
  }, [currentRecordIndex, sourceDataRows]);

  const goToPreviousRecord = useCallback(() => {
    if (currentRecordIndex !== null && currentRecordIndex > 0) {
      const prevIndex = currentRecordIndex - 1;
      setCurrentRecordIndex(prevIndex);
      setCurrentSourceRecordValues(sourceDataRows[prevIndex]);
    }
  }, [currentRecordIndex, sourceDataRows]);

  const totalRecords = sourceDataRows.length;

  const handleSubmit = useCallback(async () => {
    if (!file) { showNotification('error', 'Please select a CSV file.'); return; }
    const finalMappings: Record<string, string> = {};
    let requiredFieldsMet = true;
    CONTACT_MODEL_FIELDS_CONFIG.forEach(modelField => {
        if (modelField.required) {
            const foundMapping = targetContactFields.find(tf => tf.id === modelField.id && tf.mappedSourceHeader);
        if (!foundMapping) { requiredFieldsMet = false; }
        }
    });
    if (!requiredFieldsMet) { showNotification('error', `Map required fields: ${CONTACT_MODEL_FIELDS_CONFIG.filter(f=>f.required).map(f=>f.label).join(', ')}.`); return; }
    targetContactFields.forEach(field => { if (field.mappedSourceHeader) { finalMappings[field.mappedSourceHeader] = field.id; } });
    if (Object.keys(finalMappings).length === 0) { showNotification('error', 'Map at least one column.'); return; }
    setLoading(true); setImportResults(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('column_mapping_json', JSON.stringify(finalMappings));
    formData.append('auto_match_brands', String(autoMatchBrands));
    formData.append('match_threshold', String(matchThreshold));
    if (importSourceTag) formData.append('import_source_tag', importSourceTag);
    try {
      const response = await apiClient.post<ImportStats>('/api/v1/contacts/import/custom_csv', formData, { requiresAuth: true });
      setImportResults(response.data);
      showNotification('success', `Imported: ${response.data.imported_contacts}, Updated: ${response.data.updated_contacts}.`);
      if (onImportComplete) onImportComplete(response.data);
    } catch (error: any) {
      const message = error.response?.data?.detail || error.message || 'Import failed.';
      showNotification('error', message);
      if (error.response?.data?.detail) {
        setImportResults({ total_contacts_in_file: file ? sourceDataRows.length : 0, processed_rows: 0, imported_contacts: 0, updated_contacts: 0, matched_brands_associated: 0, import_errors: [{ error: `API Error: ${error.response.data.detail}` }]});
      }
    } finally { setLoading(false); }
  }, [file, targetContactFields, autoMatchBrands, matchThreshold, importSourceTag, apiClient, showNotification, onImportComplete, sourceDataRows]);
  
  const handleSaveAndNext = useCallback(async () => {
    if (!file || currentRecordIndex === null || !currentSourceRecordValues) {
      showNotification('error', 'No current record data to process.');
      return;
    }
    const finalMappings: Record<string, string> = {};
    targetContactFields.forEach(field => { 
      if (field.mappedSourceHeader) { finalMappings[field.mappedSourceHeader] = field.id; }
    });
    let requiredFieldsMet = true;
    let missingRequiredDatabaseFields: string[] = [];
    CONTACT_MODEL_FIELDS_CONFIG.forEach(modelField => {
      if (modelField.required) {
        const mappedSourceKey = Object.keys(finalMappings).find(key => finalMappings[key] === modelField.id);
        if (!mappedSourceKey || !currentSourceRecordValues[mappedSourceKey]?.trim()) { 
          requiredFieldsMet = false;
          missingRequiredDatabaseFields.push(modelField.label);
        }
      }
    });
    if (!requiredFieldsMet) {
      showNotification('error', `For current record, please ensure mapped values exist for required fields: ${missingRequiredDatabaseFields.join(', ')}.`);
      return;
    }
    const recordToSave: Record<string, any> = {};
    for (const sourceHeader in finalMappings) {
      const targetFieldId = finalMappings[sourceHeader];
      recordToSave[targetFieldId] = currentSourceRecordValues[sourceHeader];
    }

    setLoading(true);
    try {
      const payload = {
        contact_data: recordToSave,
        import_source_tag: importSourceTag || null,
        auto_match_brands: autoMatchBrands,
        match_threshold: matchThreshold
      };
      console.log('Sending single record to API:', payload);
      const response = await apiClient.post<ContactResponse>('/api/v1/contacts/import_single', payload, { requiresAuth: true });
      
      showNotification('success', `Record ${currentRecordIndex + 1} (${response.data.first_name} ${response.data.last_name}) processed successfully.`);
      goToNextRecord();

    } catch (error: any) {
      console.error('Error saving single record:', error);
      const message = error.response?.data?.detail || error.message || 'Failed to process record.';
      showNotification('error', `Error for record ${currentRecordIndex !== null ? currentRecordIndex + 1 : 'N/A'}: ${message}`);

    } finally {
      setLoading(false);
    }
  }, [
    file, currentRecordIndex, currentSourceRecordValues, targetContactFields, 
    importSourceTag, autoMatchBrands, matchThreshold, 
    apiClient, showNotification, goToNextRecord, setLoading
  ]);
  
  const triggerFileSelect = () => fileInputRef.current?.click();
  
  // Component for individual source CSV column items (Draggable)
  interface SourceColumnItemProps { headerName: string; currentValue?: string; }
  const SourceColumnItem: React.FC<SourceColumnItemProps> = ({ headerName, currentValue }) => {
    const [{ isDragging }, drag] = useDrag((() => ({
      type: ItemTypes.CSV_HEADER,
      item: { type: ItemTypes.CSV_HEADER, id: headerName, name: headerName },
      collect: (monitor: DragSourceMonitor) => ({ isDragging: !!monitor.isDragging() }),
    })) as any);
    return (
      <div ref={drag} className={`p-2 border rounded cursor-move bg-white hover:bg-gray-50 border-gray-300 ${isDragging ? 'opacity-50 ring-2 ring-indigo-500' : ''}`}>
        <div className="grid grid-cols-2 gap-x-2 items-center">
          <span className="text-gray-700 font-medium truncate" title={headerName}>{headerName}</span>
          <span className={`text-sm text-gray-600 truncate ${currentValue ? '' : 'italic'}`} title={currentValue || '-'}>
            {currentValue || '-'}
          </span>
        </div>
      </div>
    );
  };

  // Component for individual target contact fields (Droppable)
  interface TargetFieldItemProps { 
    field: TargetContactField; 
    onDropHeader: (targetFieldId: string, sourceHeaderId: string) => void; 
    onUnmapTarget: (targetFieldId: string) => void;
    currentSourceRecordValues?: Record<string, string> | null;
  }
  const TargetFieldItem: React.FC<TargetFieldItemProps> = ({ field, onDropHeader, onUnmapTarget, currentSourceRecordValues }) => {
    const [{ isOver, canDrop }, drop] = useDrop((() => ({
      accept: ItemTypes.CSV_HEADER,
      drop: (item: DraggableItem, monitor: DropTargetMonitor) => { onDropHeader(field.id, item.id); return { targetFieldId: field.id }; },
      collect: (monitor: DropTargetMonitor) => ({ isOver: !!monitor.isOver(), canDrop: !!monitor.canDrop() }),
    })) as any);

    const mappedDataValue = field.mappedSourceHeader && currentSourceRecordValues 
      ? currentSourceRecordValues[field.mappedSourceHeader]
      : undefined;

    const baseClasses = "p-2 border rounded transition-all duration-150 flex items-center justify-between";
    let stateClasses = "";

    if (isOver && canDrop) {
      stateClasses = "bg-green-100 ring-1 ring-green-400";
    } else if (field.mappedSourceHeader) {
      stateClasses = "bg-blue-100 border-blue-300 shadow-sm"; // Mapped state
    } else {
      stateClasses = "bg-white border-gray-300 hover:border-gray-400"; // Unmapped state
    }

    return (
      <div 
        ref={drop} 
        className={`${baseClasses} ${stateClasses}`}
      >
        <div className="font-medium text-gray-700 truncate pr-2" title={field.label}>
          {field.label}{field.required ? <span className="text-red-500">*</span> : ''}
        </div>
        
        {field.mappedSourceHeader ? (
          <div className="flex items-center text-sm">
            <span 
              className={`truncate ${mappedDataValue ? 'text-blue-700' : 'text-gray-400 italic'}`} 
              title={mappedDataValue || field.mappedSourceHeader} 
              style={{maxWidth: '120px'}} 
            >
              {mappedDataValue || '(empty)'}
            </span>
            <Tooltip title={`Mapped from: ${field.mappedSourceHeader}. Click to clear.`}>
              <Button 
                icon={<FaTrash />} 
                size="small" 
                type="text" 
                danger 
                onClick={() => onUnmapTarget(field.id)} 
                className="ml-2"
              />
            </Tooltip>
          </div>
        ) : (
          <div className="text-sm text-gray-400 italic">Not mapped</div>
        )}
      </div>
  );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="pt-2 pb-4 px-4 md:pt-2 md:pb-6 md:px-6 bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-4 gap-y-2">
          <h2 className="text-xl font-semibold text-gray-800">Map CSV Fields</h2>
        </div>

          <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" ref={fileInputRef} />

        {!file ? (
          <div className="mb-4 text-center py-8">
             <p className="text-gray-500 italic">No CSV file selected. Please select a file from the previous step.</p>
          </div>
        ) : (
          <>
            {parsingError && <Alert message={parsingError} type="error" showIcon className="mt-2 mb-4" />}
            {csvSourceHeaders.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-4">
                  <div className="p-3 border rounded-md bg-gray-50/70 min-h-[200px] flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-baseline space-x-2">
                        <h3 className="text-base font-semibold text-gray-700">Source Fields</h3>
          {file && (
                          <span 
                            className="font-medium text-gray-500 text-xs truncate" 
                            title={fileName} 
                            style={{maxWidth: '150px'}}
                          >
                            ({fileName})
                          </span>
                        )}
                      </div>
                      {csvSourceHeaders.length > 0 && totalRecords > 0 && (
                        <div className="flex items-center space-x-2">
                          <Button onClick={goToPreviousRecord} disabled={currentRecordIndex === 0} size="small" icon={<FaChevronLeft />} />
                          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                            {currentRecordIndex !== null ? currentRecordIndex + 1 : 0} / {totalRecords}
                          </span>
                          <Button onClick={goToNextRecord} disabled={currentRecordIndex === null || currentRecordIndex >= totalRecords - 1} size="small" icon={<FaChevronRight />} />
                        </div>
                      )}
        </div>
                    <div className="max-h-[340px] overflow-y-auto space-y-1 pr-1 flex-grow">
                      {csvSourceHeaders.length > 0 ? (
                          csvSourceHeaders.map(header => (
                              <SourceColumnItem 
                                key={header} 
                                headerName={header} 
                                currentValue={currentSourceRecordValues ? currentSourceRecordValues[header] : undefined}
                              />
                    ))
                ) : (
                          <p className="text-sm text-gray-500 italic p-2">No CSV columns found in the file.</p> 
                )}
              </div>
            </div>

                  <div className="p-3 border rounded-md bg-gray-50/70 min-h-[200px] flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-semibold text-gray-700">Database Fields</h3>
                        <div className="flex items-center space-x-2">
                            <Button 
                                onClick={handleSaveAndNext}
                                disabled={loading || csvSourceHeaders.length === 0 || currentRecordIndex === null}
                                size="small"
                            >
                                Save and Next
                            </Button>
                            <Button 
                                type="primary" 
                                onClick={handleSubmit} 
                                loading={loading} 
                                disabled={loading || csvSourceHeaders.length === 0}
                                size="small"
                            >
                                Batch Import All
                            </Button>
                        </div>
                    </div>
                    <div className="overflow-y-auto space-y-1 pr-1 flex-grow">
                      {targetContactFields.map(targetField => (
                  <TargetFieldItem 
                          key={targetField.id} 
                          field={targetField} 
                    onDropHeader={handleDropHeaderOnField} 
                    onUnmapTarget={handleUnmapTargetField}
                          currentSourceRecordValues={currentSourceRecordValues}
                  />
                ))}
              </div>
            </div>
          </div>

            <div className="pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6 gap-y-4 mb-4">
                    <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="importSourceTagInput">Import Source Tag (Optional)</label>
                    <Input
                            id="importSourceTagInput"
                        value={importSourceTag}
                        onChange={(e) => setImportSourceTag(e.target.value)}
                        placeholder="e.g., Conference Leads Q2"
                    />
                    </div>
                        
                        <div className="flex items-baseline justify-between"> 
                    <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="brandMatchThresholdOptions">Brand Match Threshold</label>
                    <InputNumber
                              id="brandMatchThresholdOptions"
                        min={0.1}
                        max={1.0}
                        step={0.1}
                        value={matchThreshold}
                        onChange={(value) => setMatchThreshold(value || 0.6)}
                              style={{ width: 80 }} 
                        disabled={!autoMatchBrands}
                        />
                    </div>

                          <div className="flex items-center whitespace-nowrap"> 
                        <Checkbox
                            checked={autoMatchBrands}
                            onChange={(e) => setAutoMatchBrands(e.target.checked)}
                            className="mr-2"
                                id="autoMatchBrandsCheckbox" 
                        />
                        <label className="text-sm text-gray-700" htmlFor="autoMatchBrandsCheckbox">
                                  Match Companies to Brands
                        </label>
                          </div>
                        </div>
                    </div>
                </div>
              </>
            ) : (
              loading && !parsingError && <div className="text-center py-4">Loading and parsing CSV headers...</div>
        )}
          </>
        )}
        {importResults && (
          <div className="mt-6 p-4 border border-gray-200 rounded-md bg-gray-50">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Import Results</h3>
            <p><strong>Contacts in File:</strong> {importResults.total_contacts_in_file === -1 ? (file?.name || 'N/A') : importResults.total_contacts_in_file}</p>
            <p><strong>Processed Rows:</strong> {importResults.processed_rows}</p>
            <p><strong>New Contacts Imported:</strong> {importResults.imported_contacts}</p>
            <p><strong>Existing Contacts Updated:</strong> {importResults.updated_contacts}</p>
            <p><strong>Brand Associations Made:</strong> {importResults.matched_brands_associated}</p>
            {importResults.import_errors && importResults.import_errors.length > 0 && (
              <div className="mt-4">
                <h4 className="text-md font-semibold text-red-600 mb-2">Errors ({importResults.import_errors.length}):</h4>
                <ul className="list-disc pl-5 space-y-1 max-h-60 overflow-y-auto text-sm">
                  {importResults.import_errors.map((err, index) => (
                    <li key={index} className="text-red-500">
                      {err.row_number && `Row ${err.row_number}: `}
                      {err.field && `Field '${err.field}' (Value: '${err.value || ''}') - `}
                      {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </DndProvider>
  );
};

export default CustomCSVImport; 