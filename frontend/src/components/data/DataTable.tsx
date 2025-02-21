import React, { useState, useEffect } from 'react'
import { useDataManagement } from '../../hooks/useDataManagement'
import LoadingSpinner from '../common/LoadingSpinner'
import type { Column } from '../../types/data'

interface DataTableProps {
  dataId: string
}

interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
}

interface DataRow {
  [key: string]: any
}

const DataTable: React.FC<DataTableProps> = ({ dataId }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)
  const [editingCell, setEditingCell] = useState<{ row: number; column: string } | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  const {
    selectedData,
    columns,
    isLoadingData,
    isLoadingColumns,
    isUpdatingCell,
    updateCell
  } = useDataManagement(dataId)

  useEffect(() => {
    if (editingCell && selectedData?.data) {
      const rows = selectedData.data as DataRow[]
      const value = rows[editingCell.row]?.[editingCell.column]
      setEditValue(value?.toString() || '')
    }
  }, [editingCell, selectedData])

  if (isLoadingData || isLoadingColumns) {
    return (
      <div className="h-64 flex items-center justify-center">
        <LoadingSpinner size="medium" />
      </div>
    )
  }

  if (!selectedData || !columns) {
    return (
      <div className="text-center py-8 text-gray-500">
        No data available
      </div>
    )
  }

  const activeColumns = columns
    .filter(col => col.is_active)
    .sort((a, b) => a.order - b.order)

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const rows = selectedData.data as DataRow[]
  const sortedData = [...rows].sort((a, b) => {
    if (!sortConfig) return 0
    const aVal = a[sortConfig.key]
    const bVal = b[sortConfig.key]
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  const handleCellClick = (row: number, column: string) => {
    if (!isUpdatingCell) {
      setEditingCell({ row, column })
    }
  }

  const handleCellEdit = async () => {
    if (!editingCell) return

    try {
      await updateCell({
        column_name: editingCell.column,
        row_index: editingCell.row,
        value: editValue
      })
      setEditingCell(null)
      setEditValue('')
    } catch (error) {
      // Error is handled by the mutation
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleCellEdit()
    } else if (e.key === 'Escape') {
      setEditingCell(null)
      setEditValue('')
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {activeColumns.map(column => (
              <th
                key={column.name}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort(column.name)}
              >
                <div className="flex items-center space-x-1">
                  <span>{column.name}</span>
                  {sortConfig?.key === column.name && (
                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedData.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              {activeColumns.map(column => (
                <td
                  key={column.name}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  onClick={() => handleCellClick(rowIndex, column.name)}
                >
                  {editingCell?.row === rowIndex && editingCell?.column === column.name ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleCellEdit}
                      onKeyDown={handleKeyPress}
                      className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  ) : (
                    <div className="min-h-[1.5rem]">
                      {row[column.name]}
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {sortedData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No data available
        </div>
      )}
    </div>
  )
}

export default DataTable 