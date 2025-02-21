import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNotification } from '../contexts/NotificationContext'
import LoadingSpinner from '../components/common/LoadingSpinner'
import DataTable from '../components/data/DataTable'
import ColumnManager from '../components/data/ColumnManager'
import DataToolbar from '../components/data/DataToolbar'

interface StructuredData {
  id: string
  conversation_id: string
  data_type: string
  schema_version: string
  data: Record<string, any>
  created_at: string
  updated_at: string
}

const DataManagement: React.FC = () => {
  const [selectedDataId, setSelectedDataId] = useState<string | null>(null)
  const { showNotification } = useNotification()

  const { data: structuredData, isLoading } = useQuery<StructuredData[]>({
    queryKey: ['structured-data'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/v1/data')
        if (!response.ok) throw new Error('Failed to fetch structured data')
        return response.json()
      } catch (error) {
        showNotification('error', 'Failed to load structured data')
        throw error
      }
    }
  })

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    )
  }

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
            {structuredData?.map((data) => (
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
          </div>
        </div>

        {/* Main content area */}
        <div className="col-span-3 bg-white rounded-lg shadow">
          {selectedDataId ? (
            <>
              <ColumnManager dataId={selectedDataId} />
              <DataTable dataId={selectedDataId} />
            </>
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