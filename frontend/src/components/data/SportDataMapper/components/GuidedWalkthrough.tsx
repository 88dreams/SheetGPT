import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface GuidedWalkthroughProps {
  showGuidedWalkthrough: boolean;
  setShowGuidedWalkthrough: (show: boolean) => void;
  guidedStep: number;
  setGuidedStep: React.Dispatch<React.SetStateAction<number>>;
}

const GuidedWalkthrough: React.FC<GuidedWalkthroughProps> = ({
  showGuidedWalkthrough,
  setShowGuidedWalkthrough,
  guidedStep,
  setGuidedStep
}) => {
  if (!showGuidedWalkthrough) return null;
  
  const steps = [
    {
      title: "Select an Entity Type",
      content: "Choose the type of sports data you're importing. The system has automatically recommended the best match based on your data."
    },
    {
      title: "Map Your Fields",
      content: "Drag fields from the Source Fields column to the corresponding Database Fields. Required fields are marked with an asterisk (*)."
    },
    {
      title: "Review Your Data",
      content: "Use the navigation controls to browse through your records. You can exclude any records that shouldn't be imported."
    },
    {
      title: "Import Your Data",
      content: "When you're ready, click 'Batch Import' to save all your mapped records to the database."
    }
  ];
  
  const currentStep = steps[guidedStep - 1];
  
  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-indigo-200 p-4 w-80 z-50">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-medium text-indigo-700">Step {guidedStep}: {currentStep.title}</h4>
        <button 
          onClick={() => setShowGuidedWalkthrough(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
      <p className="text-sm text-gray-600 mb-3">{currentStep.content}</p>
      <div className="flex justify-between">
        <button
          onClick={() => setGuidedStep(prev => Math.max(prev - 1, 1))}
          disabled={guidedStep === 1}
          className={`px-2 py-1 text-xs rounded ${
            guidedStep === 1 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
          }`}
        >
          Previous
        </button>
        <button
          onClick={() => {
            if (guidedStep < steps.length) {
              setGuidedStep(prev => prev + 1);
            } else {
              setShowGuidedWalkthrough(false);
            }
          }}
          className="px-2 py-1 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700"
        >
          {guidedStep < steps.length ? 'Next' : 'Finish'}
        </button>
      </div>
    </div>
  );
};

export default GuidedWalkthrough; 