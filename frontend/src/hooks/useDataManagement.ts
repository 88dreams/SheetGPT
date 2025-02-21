import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNotification } from '../contexts/NotificationContext'
import type { StructuredData, Column, DataChange, CellUpdate } from '../types/data'

export function useDataManagement(dataId?: string) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()

  // Fetch structured data
  const { data: selectedData, isLoading: isLoadingData } = useQuery<StructuredData>({
    queryKey: ['structured-data', dataId],
    queryFn: async () => {
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
  const { data: columns, isLoading: isLoadingColumns } = useQuery<Column[]>({
    queryKey: ['columns', dataId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/data/${dataId}/columns`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to fetch columns')
      }
      return response.json()
    },
    enabled: !!dataId
  })

  // Update column mutation
  const updateColumnMutation = useMutation({
    mutationFn: async ({
      columnName,
      updates
    }: {
      columnName: string
      updates: Partial<Column>
    }) => {
      const response = await fetch(`/api/v1/data/${dataId}/columns/${columnName}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
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
    }
  })

  // Update cell mutation
  const updateCellMutation = useMutation({
    mutationFn: async (update: CellUpdate) => {
      const response = await fetch(`/api/v1/data/${dataId}/cells`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(update)
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
    }
  })

  // Delete data mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/data/${dataId}`, {
        method: 'DELETE'
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
    }
  })

  return {
    selectedData,
    columns,
    isLoadingData,
    isLoadingColumns,
    isUpdatingColumn: updateColumnMutation.isPending,
    isUpdatingCell: updateCellMutation.isPending,
    isDeleting: deleteMutation.isPending,
    updateColumn: updateColumnMutation.mutate,
    updateCell: updateCellMutation.mutate,
    deleteData: deleteMutation.mutate
  }
} 