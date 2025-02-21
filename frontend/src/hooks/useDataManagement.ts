import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNotification } from '../contexts/NotificationContext'
import type { StructuredData, Column, DataChange, CellUpdate } from '../types/data'

export function useDataManagement(dataId?: string) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()

  // Fetch all structured data
  const {
    data: structuredDataList,
    isLoading: isLoadingList,
    error: listError
  } = useQuery<StructuredData[]>({
    queryKey: ['structured-data'],
    queryFn: async () => {
      const response = await fetch('/api/v1/data')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to fetch structured data')
      }
      return response.json()
    }
  })

  // Fetch single structured data
  const {
    data: selectedData,
    isLoading: isLoadingData,
    error: dataError
  } = useQuery<StructuredData>({
    queryKey: ['structured-data', dataId],
    queryFn: async () => {
      if (!dataId) throw new Error('No data ID provided')
      const response = await fetch(`/api/v1/data/${dataId}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to fetch data')
      }
      return response.json()
    },
    enabled: !!dataId
  })

  // Fetch columns
  const {
    data: columns,
    isLoading: isLoadingColumns,
    error: columnsError
  } = useQuery<Column[]>({
    queryKey: ['columns', dataId],
    queryFn: async () => {
      if (!dataId) throw new Error('No data ID provided')
      const response = await fetch(`/api/v1/data/${dataId}/columns`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to fetch columns')
      }
      return response.json()
    },
    enabled: !!dataId
  })

  // Fetch change history
  const {
    data: changeHistory,
    isLoading: isLoadingHistory,
    error: historyError
  } = useQuery<DataChange[]>({
    queryKey: ['history', dataId],
    queryFn: async () => {
      if (!dataId) throw new Error('No data ID provided')
      const response = await fetch(`/api/v1/data/${dataId}/history`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to fetch history')
      }
      return response.json()
    },
    enabled: !!dataId
  })

  // Update cell mutation
  const updateCellMutation = useMutation({
    mutationFn: async (update: CellUpdate) => {
      if (!dataId) throw new Error('No data ID provided')
      const response = await fetch(`/api/v1/data/${dataId}/cells`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(update),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to update cell')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['structured-data', dataId] })
      showNotification('success', 'Cell updated successfully')
    },
    onError: (error: Error) => {
      showNotification('error', error.message)
    },
  })

  // Update column mutation
  const updateColumnMutation = useMutation({
    mutationFn: async ({ columnName, updates }: { columnName: string; updates: Partial<Column> }) => {
      if (!dataId) throw new Error('No data ID provided')
      const response = await fetch(`/api/v1/data/${dataId}/columns/${columnName}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to update column')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['columns', dataId] })
      showNotification('success', 'Column updated successfully')
    },
    onError: (error: Error) => {
      showNotification('error', error.message)
    },
  })

  // Export data mutation
  const exportDataMutation = useMutation({
    mutationFn: async () => {
      if (!dataId) throw new Error('No data ID provided')
      const response = await fetch(`/api/v1/data/${dataId}/export`, {
        method: 'POST',
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to export data')
      }
      return response.json()
    },
    onSuccess: () => {
      showNotification('success', 'Export started successfully')
    },
    onError: (error: Error) => {
      showNotification('error', error.message)
    },
  })

  // Delete data mutation
  const deleteDataMutation = useMutation({
    mutationFn: async () => {
      if (!dataId) throw new Error('No data ID provided')
      const response = await fetch(`/api/v1/data/${dataId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to delete data')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['structured-data'] })
      showNotification('success', 'Data deleted successfully')
    },
    onError: (error: Error) => {
      showNotification('error', error.message)
    },
  })

  return {
    // Data
    structuredDataList,
    selectedData,
    columns,
    changeHistory,
    
    // Loading states
    isLoadingList,
    isLoadingData,
    isLoadingColumns,
    isLoadingHistory,
    
    // Errors
    listError,
    dataError,
    columnsError,
    historyError,
    
    // Mutations
    updateCell: updateCellMutation.mutateAsync,
    updateColumn: updateColumnMutation.mutateAsync,
    exportData: exportDataMutation.mutateAsync,
    deleteData: deleteDataMutation.mutateAsync,
    
    // Mutation states
    isUpdatingCell: updateCellMutation.isPending,
    isUpdatingColumn: updateColumnMutation.isPending,
    isExporting: exportDataMutation.isPending,
    isDeleting: deleteDataMutation.isPending,
  }
} 