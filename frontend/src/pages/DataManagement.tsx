import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useNotification } from '../contexts/NotificationContext'
import { api } from '../utils/api'
import type { StructuredData } from '../utils/api'
import LoadingSpinner from '../components/common/LoadingSpinner'
import DataTable from '../components/data/DataTable'
import ColumnManager from '../components/data/ColumnManager'
import DataToolbar from '../components/data/DataToolbar'

const DataManagement: React.FC = () => {
  const [searchParams] = useSearchParams()
  const messageId = searchParams.get('message')
  const [selectedDataId, setSelectedDataId] = useState<string | null>(null)
  const { showNotification } = useNotification()

  // Query for all structured data
  const { 
    data: structuredData,
    isLoading: isLoadingAll,
    error: allDataError
  } = useQuery({
    queryKey: ['structured-data'],
    queryFn: () => api.data.getStructuredData()
  })

  // Query for specific message data when messageId is present
  const {
    data: messageData,
    isLoading: isLoadingMessage
  } = useQuery({
    queryKey: ['structured-data', 'message', messageId],
    queryFn: () => messageId ? api.data.getStructuredDataByMessageId(messageId) : Promise.resolve(null),
    enabled: !!messageId
  })

  // Set selected data when message data is loaded
  React.useEffect(() => {
    if (messageData) {
      setSelectedDataId(messageData.id)
    }
  }, [messageData])

  // Query for selected data details
  const {
    data: selectedData,
    isLoading: isLoadingSelected
  } = useQuery({
    queryKey: ['structured-data', selectedDataId],
    queryFn: () => selectedDataId ? api.data.getStructuredDataById(selectedDataId) : Promise.resolve(null),
    enabled: !!selectedDataId
  })

  const isLoading = isLoadingAll || isLoadingMessage || isLoadingSelected

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (allDataError) {
    return (
      <div className="h-full flex items-center justify-center text-red-600">
        <div className="text-center">
          <div>Failed to load data</div>
          <div className="text-sm mt-2">Please try again later</div>
        </div>
      </div>
    )
  }

  // Ensure we have a valid array of data
  const dataList = structuredData || []

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Data Management</h1>
        <DataToolbar selectedDataId={selectedDataId} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        {/* Sidebar with data list */}
        <div className="col-span-1 bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Structured Data</h2>
          <div className="space-y-2">
            {dataList.map((data) => (
              <div
                key={data.id}
                className={`p-3 rounded cursor-pointer transition-colors ${
                  selectedDataId === data.id
                    ? 'bg-blue-100 hover:bg-blue-200'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setSelectedDataId(data.id)}
              >
                <div className="font-medium">{data.data_type}</div>
                <div className="text-sm text-gray-500">
                  {new Date(data.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
            {dataList.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                No structured data available
              </div>
            )}
          </div>
        </div>

        {/* Main content area */}
        <div className="col-span-3 bg-white rounded-lg shadow p-4">
          {selectedData ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Data Preview</h3>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 text-sm">
                  {JSON.stringify(selectedData.data, null, 2)}
                </pre>
              </div>
              <ColumnManager dataId={selectedData.id} />
              <DataTable dataId={selectedData.id} />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Select a data set to view and manage
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DataManagement 