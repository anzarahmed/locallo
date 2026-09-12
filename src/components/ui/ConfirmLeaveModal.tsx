import type { JSX } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmLeaveModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmLeaveModal({ onConfirm, onCancel }: ConfirmLeaveModalProps): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={20} className="text-amber-500" />
        </div>
        <h3 className="text-base font-bold text-gray-800 text-center mb-1">Unsaved changes</h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          You have unsaved changes. Do you want to leave without saving?
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Keep editing
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-rose-500 text-sm font-semibold text-white hover:bg-rose-600 transition-colors"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
