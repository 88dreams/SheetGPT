import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

// Entity types for sports data entry
const ENTITY_TYPES = [
  { id: 'league', name: 'League', description: 'Sports league information' },
  { id: 'team', name: 'Team', description: 'Sports team with league affiliation' },
  { id: 'player', name: 'Player', description: 'Player with team affiliation' },
  { id: 'game', name: 'Game', description: 'Game between two teams' },
  { id: 'stadium', name: 'Stadium', description: 'Stadium or venue information' },
  { id: 'broadcast', name: 'Broadcast Rights', description: 'Media broadcast rights' },
  { id: 'production', name: 'Production Service', description: 'Production service details' },
  { id: 'brand', name: 'Brand Relationship', description: 'Sponsorship or brand partnership' }
];

interface SportDataEntryModeProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEntityType: (entityType: string) => void;
}

const SportDataEntryMode: React.FC<SportDataEntryModeProps> = ({
  isOpen,
  onClose,
  onSelectEntityType
}) => {
  const [selectedEntityType, setSelectedEntityType] = useState<string | null>(null);

  const handleStartDataEntry = () => {
    if (selectedEntityType) {
      onSelectEntityType(selectedEntityType);
      onClose();
    }
  };

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div>
                  <div className="mt-3 text-center sm:mt-5">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      Add Sports Data
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Select the type of sports entity you want to add. The system will guide you through the data entry process.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {ENTITY_TYPES.map((entityType) => (
                    <div
                      key={entityType.id}
                      className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                        selectedEntityType === entityType.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-300 hover:border-indigo-300 hover:bg-indigo-50/50'
                      }`}
                      onClick={() => setSelectedEntityType(entityType.id)}
                    >
                      <h4 className="font-medium text-gray-900">{entityType.name}</h4>
                      <p className="mt-1 text-xs text-gray-500">{entityType.description}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <button
                    type="button"
                    className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:col-start-2 ${
                      selectedEntityType
                        ? 'bg-indigo-600 hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                        : 'bg-indigo-400 cursor-not-allowed'
                    }`}
                    onClick={handleStartDataEntry}
                    disabled={!selectedEntityType}
                  >
                    Start Data Entry
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default SportDataEntryMode; 