import React from 'react';
import { ConflictData } from '../types';
import { AlertTriangle, X } from 'lucide-react';

interface ConflictModalProps {
  conflict: ConflictData | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (resolvedTask: any) => void;
}

const ConflictModal: React.FC<ConflictModalProps> = ({
  conflict,
  isOpen,
  onClose,
  onResolve,
}) => {
  if (!isOpen || !conflict) return null;

  const handleMerge = () => {
    // Simple merge strategy: take server version but keep client title if different
    const merged = {
      ...conflict.serverVersion,
      title: conflict.clientVersion.title !== conflict.serverVersion.title 
        ? `${conflict.clientVersion.title} (merged)` 
        : conflict.serverVersion.title,
    };
    onResolve(merged);
  };

  const handleOverwrite = () => {
    onResolve(conflict.clientVersion);
  };

  const handleKeepServer = () => {
    onResolve(conflict.serverVersion);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-semibold text-red-600">Conflict Detected</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-gray-600 mb-6">
          This task was modified by someone else while you were editing it. Please choose how to resolve the conflict:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">Your Version</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Title:</strong> {conflict.clientVersion.title}</p>
              <p><strong>Description:</strong> {conflict.clientVersion.description}</p>
              <p><strong>Assigned:</strong> {conflict.clientVersion.assignedUser}</p>
              <p><strong>Status:</strong> {conflict.clientVersion.status}</p>
              <p><strong>Priority:</strong> {conflict.clientVersion.priority}</p>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">Server Version</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Title:</strong> {conflict.serverVersion.title}</p>
              <p><strong>Description:</strong> {conflict.serverVersion.description}</p>
              <p><strong>Assigned:</strong> {conflict.serverVersion.assignedUser}</p>
              <p><strong>Status:</strong> {conflict.serverVersion.status}</p>
              <p><strong>Priority:</strong> {conflict.serverVersion.priority}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={handleKeepServer}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Keep Server Version
          </button>
          <button
            onClick={handleMerge}
            className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
          >
            Merge Changes
          </button>
          <button
            onClick={handleOverwrite}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Overwrite with My Version
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictModal;