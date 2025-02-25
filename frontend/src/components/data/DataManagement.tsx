  // Render the list of structured data
  const renderStructuredDataList = () => {
    if (isLoadingStructuredData) {
      return <LoadingSpinner />
    }

    if (!structuredData || structuredData.length === 0) {
      return <div className="text-gray-500 p-4">No structured data available</div>
    }

    return (
      <div className="space-y-2">
        {structuredData.map((data) => {
          // Get display name from metadata if available, otherwise use data_type
          const displayName = data.meta_data?.name || data.data_type;
          
          console.log('Structured data item:', {
            id: data.id,
            data_type: data.data_type,
            meta_data: data.meta_data,
            displayName
          });
          
          return (
            <div
              key={data.id}
              className={`p-3 rounded-md cursor-pointer transition-colors ${
                selectedDataId === data.id
                  ? 'bg-blue-100 dark:bg-blue-900'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              onClick={() => handleSelectData(data.id)}
            >
              <div className="font-medium">{displayName}</div>
              <div className="text-xs text-gray-500">
                {formatDate(data.created_at)} • {data.data_type}
                {data.meta_data?.source && ` • Source: ${data.meta_data.source}`}
              </div>
            </div>
          )
        })}
      </div>
    )
  } 