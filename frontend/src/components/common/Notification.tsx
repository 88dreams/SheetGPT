import React, { useEffect } from 'react'

interface NotificationProps {
  type: 'success' | 'error' | 'info'
  message: string
  onClose: () => void
  duration?: number
}

const Notification: React.FC<NotificationProps> = ({
  type,
  message,
  onClose,
  duration = 5000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-400 text-green-700'
      case 'error':
        return 'bg-red-50 border-red-400 text-red-700'
      case 'info':
        return 'bg-blue-50 border-blue-400 text-blue-700'
      default:
        return 'bg-gray-50 border-gray-400 text-gray-700'
    }
  }

  return (
    <div
      className={`fixed top-4 right-4 w-96 border px-4 py-3 rounded-lg shadow-lg ${getStyles()}`}
      role="alert"
    >
      <div className="flex justify-between items-center">
        <span className="block sm:inline">{message}</span>
        <button
          onClick={onClose}
          className="ml-4 text-current hover:opacity-75"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default Notification 