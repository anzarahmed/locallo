import { useState, type JSX } from 'react';
import { X, Plus, Pencil, Trash2, Check, BookOpen } from 'lucide-react';
import { createLedger, updateLedger, deleteLedger } from '../../services/pnlService';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/axios';
import type { Ledger } from '../../types';

interface LedgerManagerModalProps {
  ledgers: Ledger[];
  onLedgerCreated: (ledger: Ledger) => void;
  onLedgerUpdated: (ledger: Ledger) => void;
  onLedgerDeleted: (id: string) => void;
  onClose: () => void;
}

export default function LedgerManagerModal({
  ledgers,
  onLedgerCreated,
  onLedgerUpdated,
  onLedgerDeleted,
  onClose,
}: LedgerManagerModalProps): JSX.Element {
  const toast = useToast();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate(): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const { ledger } = await createLedger(trimmed);
      onLedgerCreated(ledger);
      setName('');
      toast.success('Ledger created');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create ledger');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(ledger: Ledger): void {
    setEditingId(ledger.id);
    setEditValue(ledger.name);
    setConfirmId(null);
  }

  async function handleSaveEdit(id: string): Promise<void> {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const { ledger } = await updateLedger(id, trimmed);
      onLedgerUpdated(ledger);
      setEditingId(null);
      toast.success('Ledger renamed');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to rename ledger');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string): Promise<void> {
    setDeletingId(id);
    try {
      await deleteLedger(id);
      onLedgerDeleted(id);
      toast.success('Ledger deleted');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete ledger');
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <BookOpen size={16} className="text-teal-600" /> Ledgers
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 mb-4 shrink-0">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New ledger name"
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white outline-none focus:border-teal-400 transition-colors"
          />
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating || !name.trim()}
            className="shrink-0 w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center hover:bg-teal-100 transition-colors disabled:opacity-50"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="overflow-y-auto space-y-2">
          {ledgers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No ledgers yet</p>
          ) : (
            ledgers.map(ledger => (
              <div key={ledger.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 gap-2">
                {editingId === ledger.id ? (
                  <>
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      autoFocus
                      className="w-full px-2 py-1.5 text-sm rounded-lg border border-teal-300 bg-white outline-none"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => void handleSaveEdit(ledger.id)}
                        disabled={saving || !editValue.trim()}
                        className="text-teal-600 hover:text-teal-700 disabled:opacity-50"
                        title="Save"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-gray-700 truncate">{ledger.name}</span>
                    {confirmId === ledger.id ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => void handleDelete(ledger.id)}
                          disabled={deletingId === ledger.id}
                          className="text-xs font-semibold text-rose-600 hover:underline disabled:opacity-50"
                        >
                          {deletingId === ledger.id ? 'Deleting…' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="text-xs font-semibold text-gray-400 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => startEdit(ledger)}
                          className="text-gray-400 hover:text-teal-600 transition-colors"
                          title="Rename ledger"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setConfirmId(ledger.id)}
                          className="text-gray-400 hover:text-rose-500 transition-colors"
                          title="Delete ledger"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
