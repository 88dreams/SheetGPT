import React, { useState, useEffect, useRef } from 'react';
import { Modal, Select, Spin, Alert, Button, Form, Input, Checkbox, Space } from 'antd';
import { useSchemaContext, SchemaTable, SchemaColumn } from '../../contexts/SchemaContext';

const { Option } = Select;

interface QueryHelperModalProps {
  isVisible: boolean;
  onClose: () => void;
  onApplyQuery: (nlq: string) => void;
}

const formatTableOptionDisplay = (table: SchemaTable): string => {
  const capitalizedTableName = table.name.charAt(0).toUpperCase() + table.name.slice(1);
  if (table.description && table.description.trim() !== '') {
    return `${capitalizedTableName} (${table.description.trim()})`; // Ensure description is also trimmed
  }
  return capitalizedTableName;
};

const QueryHelperModal: React.FC<QueryHelperModalProps> = ({ isVisible, onClose, onApplyQuery }) => {
  const { schemaSummary, isLoading: isSchemaLoading, error: schemaError } = useSchemaContext();
  const [selectedTable, setSelectedTable] = useState<SchemaTable | null>(null);
  const [filters, setFilters] = useState<Record<string, { value: string; active: boolean }>>({});
  const [generatedNLQ, setGeneratedNLQ] = useState<string>('');
  
  const modalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset state when modal visibility changes
    if (isVisible) {
      setSelectedTable(null);
      setFilters({});
      setGeneratedNLQ('');
    } else {
        // Also reset when closing, just in case
        setSelectedTable(null);
        setFilters({});
        setGeneratedNLQ('');
    }
  }, [isVisible]);

  const activeFiltersString = React.useMemo(() => {
    if (!selectedTable) return '';
    return Object.entries(filters)
      .filter(([_, f]) => f.active && f.value.trim() !== '')
      .map(([columnName, filterDetails]) => `${columnName}=${filterDetails.value}`)
      .sort() // Ensure consistent order
      .join('&');
  }, [filters, selectedTable]);

  useEffect(() => {
    // Auto-generate NLQ when table or active filters (and their values) change
    if (selectedTable) {
      let nlq = `Show all ${selectedTable.name.replace(/_/g, ' ')}`;
      // Use Object.entries(filters) directly here as activeFiltersString already captures the change
      const activeFilters = Object.entries(filters).filter(([_, f]) => f.active && f.value.trim() !== '');
      
      if (activeFilters.length > 0) {
        nlq += " where ";
        nlq += activeFilters.map(([columnName, filterDetails]) => {
          const columnSchema = selectedTable.columns.find(c => c.name === columnName);
          let fieldDisplayName = columnName.replace(/_/g, ' '); // Default display name, replace underscores

          // If it's an ID field, make the NLQ more natural
          // and assume the user typed a NAME to search for in the related table
          if (columnName.endsWith('_id') && columnSchema) {
            // e.g., league_id -> "league"
            fieldDisplayName = columnName.replace(/_id$/, '').replace(/_/g, ' '); 
            return `${fieldDisplayName} is '${filterDetails.value}'`; // e.g., "league is 'NFL'"
          } else {
            // For non-ID fields or if schema not found (should not happen)
            return `${fieldDisplayName} is '${filterDetails.value}'`;
          }
        }).join(' and ');
      }
      nlq += ".";
      setGeneratedNLQ(nlq);
    } else {
      setGeneratedNLQ('');
    }
  }, [selectedTable, activeFiltersString]); // Depend on the memoized string

  const handleTableChange = (tableName: string) => {
    const table = schemaSummary?.tables.find(t => t.name === tableName) || null;
    setSelectedTable(table);
    setFilters({}); // Reset filters when table changes
  };

  const handleFilterActiveChange = (columnName: string, isActive: boolean) => {
    setFilters(prev => ({
      ...prev,
      [columnName]: { value: prev[columnName]?.value || '', active: isActive },
    }));
  };

  const handleFilterValueChange = (columnName: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [columnName]: { value, active: prev[columnName]?.active || false },
    }));
  };

  const handleApply = () => {
    if (generatedNLQ) {
      onApplyQuery(generatedNLQ);
      onClose(); // Close modal after applying
    }
  };

  const renderContent = () => {
    if (isSchemaLoading) {
      return <div className="flex justify-center items-center h-64"><Spin tip="Loading schema..." /></div>;
    }
    if (schemaError) {
      return <Alert message="Error Loading Schema" description={schemaError.message} type="error" showIcon />;
    }
    if (!schemaSummary || schemaSummary.tables.length === 0) {
      return <Alert message="Schema Not Available" description="No schema information found to build a query." type="warning" showIcon />;
    }

    return (
      <div ref={modalContentRef} style={{ maxHeight: 'calc(70vh - 120px)', overflowY: 'auto', paddingRight: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form layout="vertical">
            <Form.Item label="Select Primary Data / Table">
              <Select 
                showSearch
                placeholder="Select a table"
                onChange={handleTableChange}
                value={selectedTable?.name}
                filterOption={(input, option) => 
                  option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
                }
                getPopupContainer={() => modalContentRef.current || document.body}
              >
                {schemaSummary.tables.map(table => (
                  <Option key={table.name} value={table.name}>
                    {formatTableOptionDisplay(table)}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {selectedTable && (
              <div>
                <h4 className="text-md font-semibold mb-2">Filter by columns in '{selectedTable.name}':</h4>
                {selectedTable.columns.map(col => {
                  let colNameDisplay = col.name.replace(/_/g, ' ').toUpperCase(); // Uppercase the column name part
                  let columnLabel = colNameDisplay;
                  if (col.description && col.description.trim() !== '') {
                    columnLabel = `${colNameDisplay} - ${col.description.trim()}`;
                  }
                  return (
                    <Form.Item key={col.name} label={columnLabel}>
                      <Space>
                        <Checkbox 
                            checked={filters[col.name]?.active || false} 
                            onChange={(e) => handleFilterActiveChange(col.name, e.target.checked)}
                        />
                        <Input 
                          placeholder={`Enter value for ${col.name.replace(/_/g, ' ')}`}
                          value={filters[col.name]?.value || ''}
                          onChange={(e) => handleFilterValueChange(col.name, e.target.value)}
                          disabled={!filters[col.name]?.active}
                        />
                      </Space>
                    </Form.Item>
                  );
                })}
              </div>
            )}
            
            {generatedNLQ && (
              <Form.Item label="Generated Natural Language Query" style={{ marginTop: '16px' }}>
                  <Input.TextArea value={generatedNLQ} readOnly autoSize={{ minRows: 2, maxRows: 4 }}/>
              </Form.Item>
            )}
          </Form>
        </Space>
      </div>
    );
  };

  return (
    <Modal
      title="Query Helper / Builder"
      open={isVisible}
      onCancel={onClose}
      width={700}
      footer={[
        <Button key="back" onClick={onClose}>Cancel</Button>,
        <Button key="submit" type="primary" onClick={handleApply} disabled={!generatedNLQ || !selectedTable}>
          Use this Query
        </Button>,
      ]}
    >
      {renderContent()}
    </Modal>
  );
};

export default QueryHelperModal; 