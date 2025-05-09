import React from 'react';
import { Modal, Input, Select, Button, Spin, Alert } from 'antd'; // Assuming Ant Design is used
import LoadingSpinner from '../common/LoadingSpinner'; // Or your custom spinner

const { Option } = Select;

interface SheetsExportDialogProps {
  isVisible: boolean;
  dialogTitle?: string; // Title of the modal itself
  spreadsheetTitle: string;
  setSpreadsheetTitle: (title: string) => void;
  selectedSheetTemplate: string;
  setSelectedSheetTemplate: (template: string) => void;
  availableSheetTemplates: string[];
  isLoadingSheetTemplates: boolean;
  sheetAuthStatus: 'checking' | 'authenticated' | 'unauthenticated';
  isConfirmExportingInProgress: boolean;
  onClose: () => void;
  onConfirmExport: () => void;
  onInitiateAuth: () => void;
}

const SheetsExportDialog: React.FC<SheetsExportDialogProps> = ({
  isVisible,
  dialogTitle = 'Export to Google Sheets',
  spreadsheetTitle,
  setSpreadsheetTitle,
  selectedSheetTemplate,
  setSelectedSheetTemplate,
  availableSheetTemplates,
  isLoadingSheetTemplates,
  sheetAuthStatus,
  isConfirmExportingInProgress,
  onClose,
  onConfirmExport,
  onInitiateAuth,
}) => {
  return (
    <Modal
      title={dialogTitle}
      visible={isVisible}
      onCancel={onClose}
      footer={[
        <Button key="back" onClick={onClose} disabled={isConfirmExportingInProgress}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={isConfirmExportingInProgress}
          onClick={onConfirmExport}
          disabled={sheetAuthStatus !== 'authenticated' || !spreadsheetTitle.trim()}
        >
          Export to Google Sheets
        </Button>,
      ]}
      width={600}
    >
      {sheetAuthStatus === 'checking' && (
        <div className="flex items-center justify-center my-4">
          <Spin />
          <span className="ml-2">Checking authentication status...</span>
        </div>
      )}

      {sheetAuthStatus === 'unauthenticated' && (
        <Alert
          message="Authentication Required"
          description="To export to Google Sheets, you need to authenticate with your Google account first."
          type="info"
          showIcon
          action={
            <Button type="primary" onClick={onInitiateAuth}>
              Connect to Google Sheets
            </Button>
          }
          className="mb-4"
        />
      )}

      {sheetAuthStatus === 'authenticated' && (
        <Alert
          message="Authenticated with Google"
          type="success"
          showIcon
          className="mb-4"
        />
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="spreadsheetTitle" className="block text-sm font-medium text-gray-700 mb-1">
            Spreadsheet Name:
          </label>
          <Input
            id="spreadsheetTitle"
            value={spreadsheetTitle}
            onChange={(e) => setSpreadsheetTitle(e.target.value)}
            placeholder="Enter spreadsheet name"
            disabled={isConfirmExportingInProgress || sheetAuthStatus !== 'authenticated'}
          />
        </div>

        <div>
          <label htmlFor="sheetTemplate" className="block text-sm font-medium text-gray-700 mb-1">
            Template:
          </label>
          {isLoadingSheetTemplates ? (
            <Spin />
          ) : (
            <Select
              id="sheetTemplate"
              value={selectedSheetTemplate}
              onChange={(value) => setSelectedSheetTemplate(value)}
              className="w-full"
              disabled={isConfirmExportingInProgress || sheetAuthStatus !== 'authenticated'}
            >
              {availableSheetTemplates.map((template) => (
                <Option key={template} value={template}>
                  {template}
                </Option>
              ))}
            </Select>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SheetsExportDialog; 