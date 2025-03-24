
import React from "react";
import { useSportsDatabase } from "./SportsDatabaseContext";
import LoadingSpinner from "../../common/LoadingSpinner";

interface EntityListProps {
  className?: string;
}

const EntityList: React.FC<EntityListProps> = ({ className = "" }) => {
  const { isLoading, selectedEntityType } = useSportsDatabase();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="medium" />
        <span className="ml-2 text-gray-600">Loading entities...</span>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Entity List</h2>
      <p>
        This is a simplified placeholder for the EntityList component.
        Selected entity type: {selectedEntityType}
      </p>
      <p className="mt-4 p-2 bg-yellow-100 rounded-md">
        Working on implementing column resizing for this component.
      </p>
    </div>
  );
};

export default EntityList;

