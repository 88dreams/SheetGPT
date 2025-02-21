import React from 'react'
import { useDataManagement } from '../../hooks/useDataManagement'
import LoadingSpinner from '../common/LoadingSpinner'
import type { Column } from '../../types/data'

interface ColumnManagerProps {
  dataId: string
}

const ColumnManager: React.FC<ColumnManagerProps> = ({ dataId }) => {
  const {
    columns,
    isLoadingColumns,
    isUpdatingColumn,
    updateColumn
  } = useDataManagement(dataId)

  if (isLoadingColumns) {
    return (
      <div className="h-16 flex items-center justify-center">
        <LoadingSpinner size="small" />
      </div>
    )
  }

  if (!columns) {
    return (
      <div className="text-center py-4 text-gray-500">
        No columns available
      </div>
    )
  }

  const handleVisibilityToggle = async (column: Column) => {
    if (isUpdatingColumn) return

    try {
      await updateColumn({
        columnName: column.name,
        updates: {
          is_active: !column.is_active
        }
      })
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  const handleMoveColumn = async (column: Column, direction: 'up' | 'down') => {
    if (isUpdatingColumn) return

    const sortedColumns = [...columns].sort((a, b) => a.order - b.order)
    const currentIndex = sortedColumns.findIndex(col => col.id === column.id)
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

    if (targetIndex < 0 || targetIndex >= sortedColumns.length) return

    const targetColumn = sortedColumns[targetIndex]
    const currentOrder = column.order
    const targetOrder = targetColumn.order

    try {
      await updateColumn({
        columnName: column.name,
        updates: { order: targetOrder }
      })
      await updateColumn({
        columnName: targetColumn.name,
        updates: { order: currentOrder }
      })
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  const sortedColumns = [...columns].sort((a, b) => a.order - b.order)

  return (
    <div className="p-4 border-b">
      <h3 className="text-lg font-medium mb-4">Column Management</h3>
      <div className="space-y-2">
        {sortedColumns.map(column => (
          <div
            key={column.id}
            className="flex items-center justify-between p-2 bg-gray-50 rounded"
          >
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={column.is_active}
                onChange={() => handleVisibilityToggle(column)}
                className="rounded text-blue-600"
                disabled={isUpdatingColumn}
              />
              <span className="text-sm font-medium">{column.name}</span>
              {column.format && (
                <span className="text-xs text-gray-500">({column.format})</span>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleMoveColumn(column, 'up')}
                disabled={column.order === 0 || isUpdatingColumn}
                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                ↑
              </button>
              <button
                onClick={() => handleMoveColumn(column, 'down')}
                disabled={column.order === columns.length - 1 || isUpdatingColumn}
                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                ↓
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ColumnManager 