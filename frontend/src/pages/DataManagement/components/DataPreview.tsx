import React from 'react';

interface DataPreviewProps {
  extractedData: any;
  onSave: () => void;
  onClose: () => void;
}

const DataPreview: React.FC<DataPreviewProps> = ({ extractedData, onSave, onClose }) => {
  if (!extractedData) return null;

  return (
    <div className="p-4">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
        <h3 className="font-medium text-blue-800">Extracted Data Preview</h3>
        <p className="text-sm text-blue-600 mt-1">
          Preview mode: This data is temporarily available. Click the button below to save it to the database.
        </p>
        <div className="flex gap-2 mt-2">
          <button 
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            onClick={onSave}
          >
            Save to Database
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {extractedData.headers && extractedData.headers.map((header: string) => (
                <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {extractedData.rows && extractedData.rows.map((row: any, index: number) => (
              <tr key={index}>
                {extractedData.headers && extractedData.headers.map((header: string) => (
                  <td key={`${index}-${header}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {typeof row === 'object' ? row[header] : row[extractedData.headers.indexOf(header)]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="flex justify-end mt-4">
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 shadow"
          onClick={onClose}
        >
          Close Preview
        </button>
      </div>
    </div>
  );
};

export default DataPreview;