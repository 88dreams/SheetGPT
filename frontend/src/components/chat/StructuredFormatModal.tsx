import React, { useState } from 'react'
import { Dialog } from '@headlessui/react'

interface StructuredFormatModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (format: Record<string, any>) => void
}

const PRESET_FORMATS = {
  'Table Data': {
    headers: ['string'],
    rows: [['string']]
  },
  'Summary': {
    summary: 'string',
    key_points: ['string'],
    action_items: ['string']
  },
  'Analytics': {
    metrics: {
      total: 'number',
      average: 'number',
      growth_rate: 'number'
    },
    trends: ['string'],
    recommendations: ['string']
  }
}

const StructuredFormatModal: React.FC<StructuredFormatModalProps> = ({
  isOpen,
  onClose,
  onApply
}) => {
  const [selectedFormat, setSelectedFormat] = useState<string>('')
  const [customFormat, setCustomFormat] = useState('')

  const handleApply = () => {
    let format: Record<string, any>
    
    if (selectedFormat === 'custom') {
      try {
        format = JSON.parse(customFormat)
      } catch (error) {
        alert('Invalid JSON format')
        return
      }
    } else {
      format = PRESET_FORMATS[selectedFormat as keyof typeof PRESET_FORMATS] || {}
    }
    
    onApply(format)
    onClose()
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-10 overflow-y-auto"
    >
      <div className="flex min-h-screen items-center justify-center">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <Dialog.Title className="text-lg font-semibold mb-4">
            Select Data Structure Format
          </Dialog.Title>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preset Formats
              </label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="w-full rounded-md border border-gray-300 p-2"
              >
                <option value="">Select a format...</option>
                {Object.keys(PRESET_FORMATS).map((format) => (
                  <option key={format} value={format}>
                    {format}
                  </option>
                ))}
                <option value="custom">Custom Format</option>
              </select>
            </div>

            {selectedFormat === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Format (JSON)
                </label>
                <textarea
                  value={customFormat}
                  onChange={(e) => setCustomFormat(e.target.value)}
                  placeholder="Enter JSON format..."
                  rows={5}
                  className="w-full rounded-md border border-gray-300 p-2 font-mono text-sm"
                />
              </div>
            )}

            {selectedFormat && selectedFormat !== 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Format Preview
                </label>
                <pre className="bg-gray-50 p-3 rounded-md text-sm overflow-auto max-h-40">
                  {JSON.stringify(PRESET_FORMATS[selectedFormat as keyof typeof PRESET_FORMATS], null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!selectedFormat}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Format
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

export default StructuredFormatModal 