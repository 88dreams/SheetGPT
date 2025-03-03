import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNotification } from '../contexts/NotificationContext'
import { api } from '../utils/api'
import type { StructuredData, Column, RowData } from '../utils/api'

export function useDataManagement(dataId?: string) {
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()

  // Fetch structured data
  const { data: selectedData, isLoading: isLoadingData } = useQuery<StructuredData | null>({
    queryKey: ['structured-data', dataId],
    queryFn: async () => {
      if (!dataId) return null
      try {
        return await api.data.getStructuredDataById(dataId)
      } catch (error) {
        if ((error as any)?.status === 404) {
          return null
        }
        throw error
      }
    },
    enabled: !!dataId,
    retry: false // Don't retry on 404s
  })

  // Fetch columns
  const { data: columns, isLoading: isLoadingColumns } = useQuery<Column[]>({
    queryKey: ['columns', dataId],
    queryFn: async () => {
      if (!dataId) return []
      try {
        return await api.data.getColumns(dataId)
      } catch (error) {
        if ((error as any)?.status === 404) {
          return []
        }
        throw error
      }
    },
    enabled: !!dataId,
    retry: false // Don't retry on 404s
  })

  // Update column mutation
  const updateColumnMutation = useMutation({
    mutationFn: ({
      columnName,
      updates
    }: {
      columnName: string
      updates: Partial<Column>
    }) => {
      if (!dataId) throw new Error('No data ID provided')
      return api.data.updateColumn(dataId, columnName, updates)
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
    mutationFn: (update: { column_name: string; row_index: number; value: any }) => {
      if (!dataId) throw new Error('No data ID provided')
      return api.data.updateCell(dataId, update)
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
    mutationFn: () => {
      if (!dataId) throw new Error('No data ID provided')
      return api.data.deleteStructuredData(dataId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['structured-data'] })
      showNotification('success', 'Data deleted successfully')
    },
    onError: (error: Error) => {
      showNotification('error', error.message)
    }
  })

  // Add row mutation
  const addRowMutation = useMutation({
    mutationFn: (rowData: Record<string, any>) => {
      if (!dataId) throw new Error('No data ID provided')
      return api.data.addRow(dataId, rowData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['structured-data', dataId] })
      showNotification('success', 'Row added successfully')
    },
    onError: (error: Error) => {
      showNotification('error', error.message)
    }
  })

  // Delete row mutation
  const deleteRowMutation = useMutation({
    mutationFn: (rowIndex: number) => {
      if (!dataId) throw new Error('No data ID provided')
      return api.data.deleteRow(dataId, rowIndex)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['structured-data', dataId] })
      showNotification('success', 'Row deleted successfully')
    },
    onError: (error: Error) => {
      showNotification('error', error.message)
    }
  })

  const saveDataMutation = useMutation({
    mutationFn: async ({ data, messageId }: { data: any; messageId: string }) => {
      const response = await api.data.createStructuredData({
        data_type: 'chat_extraction',
        schema_version: '1.0',
        data,
        meta_data: {
          message_id: messageId,
          source: 'message',
          created_from: 'preview_data_button',
          created_at: new Date().toISOString()
        }
      })
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['structured-data'] })
    }
  })

  const saveData = async (data: any, messageId: string) => {
    try {
      const result = await saveDataMutation.mutateAsync({ data, messageId })
      return result
    } catch (error) {
      console.error('Error saving data:', error)
      throw error
    }
  }

  return {
    selectedData,
    columns,
    isLoadingData,
    isLoadingColumns,
    isUpdatingColumn: updateColumnMutation.isPending,
    isUpdatingCell: updateCellMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isAddingRow: addRowMutation.isPending,
    isDeletingRow: deleteRowMutation.isPending,
    updateColumn: updateColumnMutation.mutate,
    updateCell: updateCellMutation.mutate,
    deleteData: deleteMutation.mutate,
    addRow: addRowMutation.mutate,
    deleteRow: deleteRowMutation.mutate,
    saveData
  }
} 