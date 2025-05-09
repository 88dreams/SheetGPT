import React from 'react';
import { UpdateResults } from '../types';
import LoadingSpinner from '../../LoadingSpinner';
import { Progress, Button, Alert, Space, Typography } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, LoadingOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface ProcessingStatusProps {
  status: 'loading' | 'processing' | 'results' | 'idle';
  processingProgress?: number;
  results?: UpdateResults;
  onClose?: () => void;
  isProcessing: boolean;
}

/**
 * Component for displaying processing status and results
 */
const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  status,
  processingProgress = 0,
  results = { success: 0, failed: 0 },
  onClose,
  isProcessing
}) => {
  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center p-8">
        <LoadingSpinner size="medium" />
        <span className="ml-2">Loading fields...</span>
      </div>
    );
  }

  if (status === 'processing') {
    return (
      <div className="p-6">
        <h3 className="text-lg font-medium mb-4">Processing Updates</h3>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: `${processingProgress}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600">
          Processing {processingProgress}% complete...
        </p>
      </div>
    );
  }

  if (status === 'results') {
    return (
      <div className="p-6">
        <h3 className="text-lg font-medium mb-4">Update Complete</h3>
        <div className="flex justify-between mb-4">
          <div className="text-green-600">
            <span className="font-bold">{results.success}</span> updates successful
          </div>
          {results.failed > 0 && (
            <div className="text-red-600">
              <span className="font-bold">{results.failed}</span> updates failed
            </div>
          )}
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default ProcessingStatus;