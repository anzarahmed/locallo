import { useState, type JSX } from 'react';
import { Plus, X, ChevronDown, ChevronUp, Trash2, Pencil, Sparkles } from 'lucide-react';
import type { AttributeField, AttributeFieldOption, AttributeFieldType } from '../../types';

type ShadeCount = 3 | 5 | 7;

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
  shadeGenOpen: boolean;
  shadeGenName: string;
  shadeGenHex: string;
  shadeGenCount: ShadeCount;
  shadeGenExcluded: number[];
}

const EMPTY_DRAFT: DraftField = {
  label: '', key: '', type: 'text', required: false, isVariant: false, isStockDependent: false,
  unit: '', options: [],
  newOptLabel: '', newOptValue: '', newOptHex: '#000000',
  shadeGenOpen: false, shadeGenName: '', shadeGenHex: '#FF69B4', shadeGenCount: 5, shadeGenExcluded: [],
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

const SHADE_STEPS: Record<ShadeCount, { suffix: string; lightness: number }[]> = {
  3: [
    { suffix: ' Light', lightness: 80 },
    { suffix: '',       lightness: 50 },
    { suffix: ' Dark',  lightness: 25 },
  ],
  5: [
    { suffix: ' 100', lightness: 90 },
    { suffix: ' 300', lightness: 70 },
    { suffix: ' 500', lightness: 50 },
    { suffix: ' 700', lightness: 30 },
    { suffix: ' 900', lightness: 15 },
  ],
  7: [
    { suffix: ' 100', lightness: 93 },
    { suffix: ' 200', lightness: 82 },
    { suffix: ' 300', lightness: 70 },
    { suffix: ' 500', lightness: 50 },
    { suffix: ' 600', lightness: 38 },
    { suffix: ' 700', lightness: 27 },
    { suffix: ' 900', lightness: 12 },
  ],
};

function toKey(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r:  h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g:  h = ((b - r) / d + 2) / 6; break;
    default: h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  h /= 360; s /= 100; l /= 100;
  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number): string => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function buildShades(baseHex: string, name: string, count: ShadeCount): AttributeFieldOption[] {
  if (!name.trim() || !/^#[0-9a-fA-F]{6}$/.test(baseHex)) return [];
  const [h, s] = hexToHsl(baseHex);
  return SHADE_STEPS[count].map(({ suffix, lightness }) => {
    const label = `${name.trim()}${suffix}`;
    return { label, value: toKey(label), hex: hslToHex(h, s, lightness) };
  });
}

function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

export default function AttributeSchemaEditor({ value, onChange }: AttributeSchemaEditorProps): JSX.Element {
  const [open, setOpen]             = useState(false);
  const [adding, setAdding]         = useState(false);
  const [draft, setDraft]           = useState<DraftField>(EMPTY_DRAFT);
  const [draftError, setDraftError] = useState('');
  const [expandedOpts, setExpandedOpts] = useState<Set<string>>(new Set());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editDraft, setEditDraft]   = useState<DraftField>(EMPTY_DRAFT);
  const [editError, setEditError]   = useState('');

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

  function startEdit(field: AttributeField): void {
    setEditingKey(field.key);
    setEditDraft({
      label:            field.label,
      key:              field.key,
      type:             field.type,
      required:         field.required ?? false,
      isVariant:        field.isVariant ?? false,
      isStockDependent: field.isStockDependent ?? false,
      unit:             field.unit ?? '',
      options:          field.options ? [...field.options] : [],
      newOptLabel: '',
      newOptValue: '',
      newOptHex:   '#000000',
      shadeGenOpen:     false,
      shadeGenName:     field.label,
      shadeGenHex:      '#FF69B4',
      shadeGenCount:    5,
      shadeGenExcluded: [],
    });
    setEditError('');
  }

  function cancelEdit(): void {
    setEditingKey(null);
    setEditDraft(EMPTY_DRAFT);
    setEditError('');
  }

  function handleEditTypeChange(type: AttributeFieldType): void {
    setEditDraft(d => ({
      ...d,
      type,
      options: HAS_OPTIONS.includes(type) ? d.options : [],
      ...(type === 'color' ? { isStockDependent: false } : {}),
    }));
  }

  function addEditOption(): void {
    if (!editDraft.newOptLabel.trim()) return;
    const option: AttributeFieldOption = {
      label: editDraft.newOptLabel.trim(),
      value: editDraft.newOptValue.trim() || toKey(editDraft.newOptLabel),
      ...(editDraft.type === 'color' ? { hex: editDraft.newOptHex } : {}),
    };
    setEditDraft(d => ({ ...d, options: [...d.options, option], newOptLabel: '', newOptValue: '', newOptHex: '#000000' }));
  }

  function removeEditOption(optValue: string): void {
    setEditDraft(d => ({ ...d, options: d.options.filter(o => o.value !== optValue) }));
  }

  function applyEditShades(): void {
    const shades = buildShades(editDraft.shadeGenHex, editDraft.shadeGenName, editDraft.shadeGenCount);
    const selected = shades.filter((_, i) => !editDraft.shadeGenExcluded.includes(i));
    if (selected.length === 0) return;
    setEditDraft(d => {
      const existing = new Set(d.options.map(o => o.value));
      const newOpts = selected.filter(s => !existing.has(s.value));
      return { ...d, options: [...d.options, ...newOpts], shadeGenOpen: false };
    });
  }

  function saveEdit(): void {
    if (!editDraft.label.trim()) { setEditError('Label is required'); return; }
    if (!editDraft.key.trim())   { setEditError('Key is required'); return; }
    if (value.some(f => f.key === editDraft.key && f.key !== editingKey)) {
      setEditError('Key already exists');
      return;
    }
    if (HAS_OPTIONS.includes(editDraft.type) && editDraft.options.length === 0) {
      setEditError('Add at least one option');
      return;
    }
    const updated: AttributeField = {
      key:              editDraft.key,
      label:            editDraft.label,
      type:             editDraft.type,
      required:         editDraft.required,
      isVariant:        editDraft.isVariant || undefined,
      isStockDependent: editDraft.isStockDependent || undefined,
      ...(editDraft.unit ? { unit: editDraft.unit } : {}),
      ...(HAS_OPTIONS.includes(editDraft.type) ? { options: editDraft.options } : {}),
    };
    onChange(value.map(f => f.key === editingKey ? updated : f));
    setEditingKey(null);
    setEditDraft(EMPTY_DRAFT);
    setEditError('');
  }

  function handleLabelChange(label: string): void {
    setDraft(d => ({
      ...d,
      label,
      key: d.key === toKey(d.label) || d.key === '' ? toKey(label) : d.key,
      shadeGenName: d.shadeGenName === d.label || d.shadeGenName === '' ? label : d.shadeGenName,
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

  function applyDraftShades(): void {
    const shades = buildShades(draft.shadeGenHex, draft.shadeGenName, draft.shadeGenCount);
    const selected = shades.filter((_, i) => !draft.shadeGenExcluded.includes(i));
    if (selected.length === 0) return;
    setDraft(d => {
      const existing = new Set(d.options.map(o => o.value));
      const newOpts = selected.filter(s => !existing.has(s.value));
      return { ...d, options: [...d.options, ...newOpts], shadeGenOpen: false };
    });
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

  function renderColorOptionsSection(
    d: DraftField,
    setD: (fn: (prev: DraftField) => DraftField) => void,
    onAddOption: () => void,
    onRemoveOption: (v: string) => void,
    onApplyShades: () => void,
  ): JSX.Element {
    const previewShades  = buildShades(d.shadeGenHex, d.shadeGenName, d.shadeGenCount);
    const canGenerate    = d.shadeGenName.trim().length > 0 && isValidHex(d.shadeGenHex);
    const selectedCount  = previewShades.filter((_, i) => !d.shadeGenExcluded.includes(i)).length;

    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-600">Options</p>

        {d.options.length > 0 && (
          <ul className="space-y-1.5 max-h-36 overflow-y-auto">
            {d.options.map(opt => (
              <li key={opt.value} className="flex items-center gap-2 text-xs text-gray-700">
                {d.type === 'color' && opt.hex && (
                  <span
                    className="w-5 h-5 rounded border border-gray-200 shrink-0"
                    style={{ backgroundColor: opt.hex }}
                    title={opt.hex}
                  />
                )}
                <span className="flex-1">{opt.label}</span>
                <code className="text-gray-400">{opt.value}</code>
                <button type="button" onClick={(): void => onRemoveOption(opt.value)} className="text-gray-300 hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Manual add row */}
        <div className="flex gap-1.5 items-center">
          {d.type === 'color' && (
            <>
              <input
                type="color"
                value={isValidHex(d.newOptHex) ? d.newOptHex : '#000000'}
                onChange={e => setD(prev => ({ ...prev, newOptHex: e.target.value }))}
                className="w-7 h-7 p-0.5 border border-gray-300 rounded cursor-pointer shrink-0"
                title="Pick colour"
              />
              <input
                type="text"
                value={d.newOptHex}
                onChange={e => {
                  let v = e.target.value.trim();
                  if (v && !v.startsWith('#')) v = '#' + v;
                  setD(prev => ({ ...prev, newOptHex: v }));
                }}
                className="w-[76px] px-2 py-1 border border-gray-300 rounded-md text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 shrink-0"
                placeholder="#000000"
                maxLength={7}
              />
            </>
          )}
          <input
            type="text"
            value={d.newOptLabel}
            onChange={e => setD(prev => ({
              ...prev,
              newOptLabel: e.target.value,
              newOptValue: prev.newOptValue || toKey(e.target.value),
            }))}
            placeholder="Label"
            className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={d.newOptValue}
            onChange={e => setD(prev => ({ ...prev, newOptValue: e.target.value }))}
            placeholder="Value"
            className="w-20 px-2 py-1 border border-gray-300 rounded-md text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={onAddOption}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md text-xs font-medium transition-colors"
          >
            Add
          </button>
        </div>

        {/* Shade generator (color type only) */}
        {d.type === 'color' && (
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <button
              type="button"
              onClick={(): void => setD(prev => ({ ...prev, shadeGenOpen: !prev.shadeGenOpen }))}
              className="w-full flex items-center justify-between px-3 py-1.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                Generate shades
              </span>
              {d.shadeGenOpen
                ? <ChevronUp className="w-3 h-3 text-gray-400" />
                : <ChevronDown className="w-3 h-3 text-gray-400" />
              }
            </button>

            {d.shadeGenOpen && (
              <div className="p-3 space-y-3 bg-white">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 min-w-0">
                    <label className="block text-[11px] text-gray-500 mb-1">Color name</label>
                    <input
                      type="text"
                      value={d.shadeGenName}
                      onChange={e => setD(prev => ({ ...prev, shadeGenName: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                      placeholder="e.g. Pink"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-pink-400"
                    />
                  </div>
                  <div className="shrink-0">
                    <label className="block text-[11px] text-gray-500 mb-1">Base color</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={isValidHex(d.shadeGenHex) ? d.shadeGenHex : '#FF69B4'}
                        onChange={e => setD(prev => ({ ...prev, shadeGenHex: e.target.value }))}
                        className="w-7 h-[30px] p-0.5 border border-gray-300 rounded cursor-pointer shrink-0"
                        title="Pick base colour"
                      />
                      <input
                        type="text"
                        value={d.shadeGenHex}
                        onChange={e => {
                          let v = e.target.value.trim();
                          if (v && !v.startsWith('#')) v = '#' + v;
                          setD(prev => ({ ...prev, shadeGenHex: v }));
                        }}
                        onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                        className="w-[76px] px-2 py-1 border border-gray-300 rounded-md text-xs font-mono focus:outline-none focus:ring-2 focus:ring-pink-400"
                        placeholder="#FF69B4"
                        maxLength={7}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-500 shrink-0">Shades:</span>
                  {([3, 5, 7] as ShadeCount[]).map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={(): void => setD(prev => ({ ...prev, shadeGenCount: n, shadeGenExcluded: [] }))}
                      className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors ${
                        d.shadeGenCount === n
                          ? 'bg-pink-100 text-pink-700 ring-1 ring-pink-300'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                {previewShades.length > 0 && (
                  <div>
                    <p className="text-[11px] text-gray-400 mb-1.5">Click to toggle individual shades</p>
                    <div className="flex gap-2.5 flex-wrap">
                      {previewShades.map((shade, i) => {
                        const excluded = d.shadeGenExcluded.includes(i);
                        return (
                          <button
                            key={shade.value}
                            type="button"
                            title={excluded ? `Include ${shade.label}` : `Exclude ${shade.label}`}
                            onClick={(): void => setD(prev => ({
                              ...prev,
                              shadeGenExcluded: prev.shadeGenExcluded.includes(i)
                                ? prev.shadeGenExcluded.filter(x => x !== i)
                                : [...prev.shadeGenExcluded, i],
                            }))}
                            className="flex flex-col items-center gap-0.5 transition-opacity focus:outline-none"
                          >
                            <span
                              className={`w-7 h-7 rounded block transition-all ${
                                excluded
                                  ? 'opacity-30 grayscale'
                                  : 'ring-2 ring-indigo-400 ring-offset-1'
                              }`}
                              style={{ backgroundColor: shade.hex }}
                            />
                            <span className={`text-[10px] max-w-[40px] truncate text-center leading-tight transition-colors ${excluded ? 'text-gray-300' : 'text-gray-400'}`}>
                              {shade.label.replace(d.shadeGenName.trim(), '').trim() || '●'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={onApplyShades}
                  disabled={!canGenerate || selectedCount === 0}
                  className="w-full px-3 py-1.5 text-xs font-semibold bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {selectedCount === d.shadeGenCount
                    ? `Add all ${selectedCount} shades`
                    : `Add ${selectedCount} shade${selectedCount === 1 ? '' : 's'}`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
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
                if (editingKey === field.key) {
                  return (
                    <li key={field.key} className="border border-indigo-200 rounded-lg p-3 space-y-3 bg-white">
                      {editError && <p className="text-xs text-red-600">{editError}</p>}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Label *</label>
                          <input
                            type="text"
                            value={editDraft.label}
                            onChange={e => setEditDraft(d => ({ ...d, label: e.target.value }))}
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Key *</label>
                          <input
                            type="text"
                            value={editDraft.key}
                            onChange={e => setEditDraft(d => ({ ...d, key: e.target.value }))}
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                          <select
                            value={editDraft.type}
                            onChange={e => handleEditTypeChange(e.target.value as AttributeFieldType)}
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
                            value={editDraft.unit}
                            onChange={e => setEditDraft(d => ({ ...d, unit: e.target.value }))}
                            placeholder="e.g. cm, kg"
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-5 flex-wrap">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editDraft.required}
                            onChange={e => setEditDraft(d => ({ ...d, required: e.target.checked }))}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-gray-700">Required field</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editDraft.isVariant}
                            onChange={e => setEditDraft(d => ({ ...d, isVariant: e.target.checked }))}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span className="text-xs text-gray-700">Is Variant</span>
                        </label>
                        <label className={`flex items-center gap-2 ${editDraft.type === 'color' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                          <input
                            type="checkbox"
                            checked={editDraft.isStockDependent}
                            disabled={editDraft.type === 'color'}
                            onChange={e => setEditDraft(d => ({ ...d, isStockDependent: e.target.checked }))}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500 disabled:cursor-not-allowed"
                          />
                          <span className="text-xs text-gray-700">Stock Dependent</span>
                        </label>
                      </div>

                      {HAS_OPTIONS.includes(editDraft.type) && renderColorOptionsSection(
                        editDraft,
                        setEditDraft,
                        addEditOption,
                        removeEditOption,
                        applyEditShades,
                      )}

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveEdit}
                          className="flex-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
                        >
                          Save Field
                        </button>
                      </div>
                    </li>
                  );
                }

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
                        onClick={(): void => startEdit(field)}
                        className="p-0.5 text-gray-400 hover:text-indigo-600 transition-colors"
                        title="Edit field"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
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
                      <ul className="px-3 pb-2 space-y-1.5 border-t border-gray-100 pt-1.5">
                        {field.options!.map(opt => (
                          <li key={opt.value} className="flex items-center gap-2 text-xs text-gray-600">
                            {field.type === 'color' && opt.hex && (
                              <span
                                className="w-5 h-5 rounded border border-gray-200 shrink-0"
                                style={{ backgroundColor: opt.hex }}
                                title={opt.hex}
                              />
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

              {HAS_OPTIONS.includes(draft.type) && renderColorOptionsSection(
                draft,
                setDraft,
                addOption,
                removeOption,
                applyDraftShades,
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
