import { useState, type JSX } from 'react';
import { Plus, X, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import type { AttributeField, AttributeFieldOption, AttributeFieldType } from '../../types';

interface AttributeSchemaEditorProps {
  value: AttributeField[];
  onChange: (fields: AttributeField[]) => void;
}

interface DraftField {
  label: string;
  key: string;
  type: AttributeFieldType;
  required: boolean;
  isVariant: boolean;
  isStockDependent: boolean;
  unit: string;
  options: AttributeFieldOption[];
  newOptLabel: string;
  newOptValue: string;
  newOptHex: string;
}

const EMPTY_DRAFT: DraftField = {
  label: '', key: '', type: 'text', required: false, isVariant: false, isStockDependent: false,
  unit: '', options: [],
  newOptLabel: '', newOptValue: '', newOptHex: '#000000',
};

const TYPE_OPTIONS: { value: AttributeFieldType; label: string }[] = [
  { value: 'text',        label: 'Text' },
  { value: 'textarea',    label: 'Textarea' },
  { value: 'number',      label: 'Number' },
  { value: 'select',      label: 'Select (single)' },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'color',       label: 'Color swatches' },
];

const TYPE_BADGE: Record<AttributeFieldType, string> = {
  text:        'bg-gray-100 text-gray-600',
  textarea:    'bg-gray-100 text-gray-600',
  number:      'bg-blue-100 text-blue-700',
  select:      'bg-purple-100 text-purple-700',
  multiselect: 'bg-indigo-100 text-indigo-700',
  color:       'bg-pink-100 text-pink-700',
};

const HAS_OPTIONS: AttributeFieldType[] = ['select', 'multiselect', 'color'];

function toKey(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export default function AttributeSchemaEditor({ value, onChange }: AttributeSchemaEditorProps): JSX.Element {
  const [open, setOpen]             = useState(false);
  const [adding, setAdding]         = useState(false);
  const [draft, setDraft]           = useState<DraftField>(EMPTY_DRAFT);
  const [draftError, setDraftError] = useState('');
  const [expandedOpts, setExpandedOpts] = useState<Set<string>>(new Set());

  function toggleOpts(key: string): void {
    setExpandedOpts(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function removeField(key: string): void {
    onChange(value.filter(f => f.key !== key));
  }

  function toggleFieldVariant(key: string): void {
    onChange(value.map(f =>
      f.key === key ? { ...f, isVariant: f.isVariant ? undefined : true } : f,
    ));
  }

  function toggleFieldStockDependent(key: string): void {
    const field = value.find(f => f.key === key);
    if (!field || field.type === 'color') return;
    const turningOn = !field.isStockDependent;
    onChange(value.map(f => {
      if (f.key === key) return { ...f, isStockDependent: turningOn ? true : undefined };
      if (turningOn && f.isStockDependent) return { ...f, isStockDependent: undefined };
      return f;
    }));
  }

  function handleLabelChange(label: string): void {
    setDraft(d => ({
      ...d,
      label,
      key: d.key === toKey(d.label) || d.key === '' ? toKey(label) : d.key,
    }));
  }

  function handleTypeChange(type: AttributeFieldType): void {
    setDraft(d => ({
      ...d,
      type,
      options: HAS_OPTIONS.includes(type) ? d.options : [],
      ...(type === 'color' ? { isStockDependent: false } : {}),
    }));
  }

  function addOption(): void {
    if (!draft.newOptLabel.trim()) return;
    const option: AttributeFieldOption = {
      label: draft.newOptLabel.trim(),
      value: draft.newOptValue.trim() || toKey(draft.newOptLabel),
      ...(draft.type === 'color' ? { hex: draft.newOptHex } : {}),
    };
    setDraft(d => ({ ...d, options: [...d.options, option], newOptLabel: '', newOptValue: '', newOptHex: '#000000' }));
  }

  function removeOption(optValue: string): void {
    setDraft(d => ({ ...d, options: d.options.filter(o => o.value !== optValue) }));
  }

  function addField(): void {
    if (!draft.label.trim()) { setDraftError('Label is required'); return; }
    if (!draft.key.trim())   { setDraftError('Key is required'); return; }
    if (value.some(f => f.key === draft.key)) { setDraftError('Key already exists'); return; }
    if (HAS_OPTIONS.includes(draft.type) && draft.options.length === 0) {
      setDraftError('Add at least one option');
      return;
    }
    setDraftError('');
    const field: AttributeField = {
      key:              draft.key,
      label:            draft.label,
      type:             draft.type,
      required:         draft.required,
      isVariant:        draft.isVariant || undefined,
      isStockDependent: draft.isStockDependent || undefined,
      ...(draft.unit ? { unit: draft.unit } : {}),
      ...(HAS_OPTIONS.includes(draft.type) ? { options: draft.options } : {}),
    };
    onChange([...value, field]);
    setDraft(EMPTY_DRAFT);
    setAdding(false);
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header toggle */}
      <button
        type="button"
        onClick={(): void => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="text-sm font-medium text-gray-700">
          Attribute Fields
          <span className="ml-2 text-xs font-normal text-gray-400">
            {value.length === 0 ? 'none configured' : `${value.length} field${value.length === 1 ? '' : 's'}`}
          </span>
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 py-3 space-y-3">
          {/* Existing fields */}
          {value.length > 0 && (
            <ul className="space-y-1.5">
              {value.map(field => {
                const hasOpts = field.options && field.options.length > 0;
                const optsOpen = expandedOpts.has(field.key);
                const stockBlocked = field.type === 'color';
                return (
                  <li key={field.key} className="rounded-lg bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-2 py-1.5 px-2">
                      <span className="flex-1 text-sm text-gray-800 font-medium truncate">{field.label}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${TYPE_BADGE[field.type]}`}>
                        {field.type}
                      </span>
                      <button
                        type="button"
                        onClick={(): void => toggleFieldVariant(field.key)}
                        title={field.isVariant ? 'Click to remove variant attribute' : 'Click to mark as variant attribute'}
                        className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                          field.isVariant
                            ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                            : 'bg-gray-100 text-gray-400 hover:bg-teal-50 hover:text-teal-600'
                        }`}
                      >
                        variant
                      </button>
                      <button
                        type="button"
                        onClick={(): void => toggleFieldStockDependent(field.key)}
                        disabled={stockBlocked}
                        title={
                          field.type === 'color'
                            ? 'Color cannot be stock dependent'
                            : field.isStockDependent
                              ? 'Click to remove stock dependent'
                              : 'Click to mark as stock dependent'
                        }
                        className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                          stockBlocked
                            ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                            : field.isStockDependent
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              : 'bg-gray-100 text-gray-400 hover:bg-amber-50 hover:text-amber-600'
                        }`}
                      >
                        stock
                      </button>
                      {field.required && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">req</span>
                      )}
                      {field.unit && (
                        <span className="text-xs text-gray-400">{field.unit}</span>
                      )}
                      {hasOpts && (
                        <button
                          type="button"
                          onClick={(): void => toggleOpts(field.key)}
                          className="flex items-center gap-0.5 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
                          title={optsOpen ? 'Hide options' : 'Show options'}
                        >
                          {field.options!.length} opts
                          {optsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(): void => removeField(field.key)}
                        className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove field"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {hasOpts && optsOpen && (
                      <ul className="px-3 pb-2 space-y-1 border-t border-gray-100 pt-1.5">
                        {field.options!.map(opt => (
                          <li key={opt.value} className="flex items-center gap-2 text-xs text-gray-600">
                            {field.type === 'color' && opt.hex && (
                              <span className="w-3 h-3 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: opt.hex }} />
                            )}
                            <span className="flex-1">{opt.label}</span>
                            <code className="text-gray-400">{opt.value}</code>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Add field form */}
          {adding ? (
            <div className="border border-gray-200 rounded-lg p-3 space-y-3 bg-white">
              {draftError && (
                <p className="text-xs text-red-600">{draftError}</p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Label *</label>
                  <input
                    type="text"
                    value={draft.label}
                    onChange={e => handleLabelChange(e.target.value)}
                    placeholder="e.g. Available Sizes"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Key *</label>
                  <input
                    type="text"
                    value={draft.key}
                    onChange={e => setDraft(d => ({ ...d, key: e.target.value }))}
                    placeholder="e.g. sizes"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                  <select
                    value={draft.type}
                    onChange={e => handleTypeChange(e.target.value as AttributeFieldType)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {TYPE_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Unit <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={draft.unit}
                    onChange={e => setDraft(d => ({ ...d, unit: e.target.value }))}
                    placeholder="e.g. cm, kg"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-5 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.required}
                    onChange={e => setDraft(d => ({ ...d, required: e.target.checked }))}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-gray-700">Required field</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.isVariant}
                    onChange={e => setDraft(d => ({ ...d, isVariant: e.target.checked }))}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-xs text-gray-700">Is Variant</span>
                </label>
                <label className={`flex items-center gap-2 ${draft.type === 'color' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={draft.isStockDependent}
                    disabled={draft.type === 'color'}
                    onChange={e => setDraft(d => ({ ...d, isStockDependent: e.target.checked }))}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 disabled:cursor-not-allowed"
                    title={draft.type === 'color' ? 'Color cannot be stock dependent' : undefined}
                  />
                  <span className="text-xs text-gray-700">Stock Dependent</span>
                </label>
              </div>

              {/* Options (select / multiselect / color) */}
              {HAS_OPTIONS.includes(draft.type) && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600">Options</p>

                  {draft.options.length > 0 && (
                    <ul className="space-y-1 max-h-28 overflow-y-auto">
                      {draft.options.map(opt => (
                        <li key={opt.value} className="flex items-center gap-2 text-xs text-gray-700">
                          {draft.type === 'color' && opt.hex && (
                            <span className="w-3.5 h-3.5 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: opt.hex }} />
                          )}
                          <span className="flex-1">{opt.label}</span>
                          <code className="text-gray-400">{opt.value}</code>
                          <button type="button" onClick={(): void => removeOption(opt.value)} className="text-gray-300 hover:text-red-500">
                            <X className="w-3 h-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex gap-1.5">
                    {draft.type === 'color' && (
                      <input
                        type="color"
                        value={draft.newOptHex}
                        onChange={e => setDraft(d => ({ ...d, newOptHex: e.target.value }))}
                        className="w-8 h-7 p-0.5 border border-gray-300 rounded cursor-pointer"
                        title="Pick colour"
                      />
                    )}
                    <input
                      type="text"
                      value={draft.newOptLabel}
                      onChange={e => setDraft(d => ({
                        ...d,
                        newOptLabel: e.target.value,
                        newOptValue: d.newOptValue || toKey(e.target.value),
                      }))}
                      placeholder="Label"
                      className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      value={draft.newOptValue}
                      onChange={e => setDraft(d => ({ ...d, newOptValue: e.target.value }))}
                      placeholder="Value"
                      className="w-20 px-2 py-1 border border-gray-300 rounded-md text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={addOption}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md text-xs font-medium transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={(): void => { setAdding(false); setDraft(EMPTY_DRAFT); setDraftError(''); }}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addField}
                  className="flex-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
                >
                  Add Field
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={(): void => setAdding(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Field
            </button>
          )}
        </div>
      )}
    </div>
  );
}
