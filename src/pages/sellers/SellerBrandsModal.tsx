import { useState, useEffect, useMemo, useRef, type ChangeEvent, type JSX } from 'react';
import { Loader2, Search, Image as ImageIcon, Tags, FileText, Upload, ExternalLink } from 'lucide-react';
import { getBrandsPaginated } from '../../services/brandService';
import { updateSellerBrands, getSellerById, uploadBrandDocument } from '../../services/sellerService';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/axios';
import { BRAND_DOCS } from '../../lib/constants';
import type { Brand, BrandDocuments, BrandDocumentType } from '../../types';

interface BrandDocSlotProps {
  label: string;
  existingUrl: string | null;
  uploading: boolean;
  disabled: boolean;
  onPick: () => void;
  onSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  inputRef: (el: HTMLInputElement | null) => void;
}

function BrandDocSlot({ label, existingUrl, uploading, disabled, onPick, onSelect, inputRef }: BrandDocSlotProps): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="text-xs text-gray-600 truncate">{label}</span>
        {existingUrl && (
          <a href={existingUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-0.5 shrink-0">
            View <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={onSelect} />
      <button
        type="button" disabled={disabled} onClick={onPick}
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-white disabled:opacity-60 transition-colors shrink-0"
      >
        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
        {existingUrl ? 'Replace' : 'Upload'}
      </button>
    </div>
  );
}

interface SellerBrandsModalProps {
  sellerId: string;
  sellerName: string;
  currentBrandIds: number[];
  onClose: () => void;
  onSaved: (brandIds: number[], brands: { id: number; name: string; slug: string }[]) => void;
}

export default function SellerBrandsModal({
  sellerId, sellerName, currentBrandIds, onClose, onSaved,
}: SellerBrandsModalProps): JSX.Element {
  const toast = useToast();

  const [brands, setBrands]     = useState<Brand[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [query, setQuery]       = useState('');
  const [selected, setSelected] = useState<number[]>(currentBrandIds);
  const [brandDocuments, setBrandDocuments] = useState<BrandDocuments>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const docInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getBrandsPaginated({ isActive: true, limit: 1000, sortBy: 'name', sortOrder: 'asc' })
      .then(r => { if (!cancelled) setBrands(r.brands); })
      .catch(() => { if (!cancelled) setError('Failed to load brands.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getSellerById(sellerId)
      .then(r => { if (!cancelled) setBrandDocuments(r.profile?.brandDocuments ?? {}); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [sellerId]);

  async function handleDocUpload(brandId: number, type: BrandDocumentType, file: File): Promise<void> {
    const key = `${brandId}-${type}`;
    setUploading(prev => ({ ...prev, [key]: true }));
    try {
      const result = await uploadBrandDocument(sellerId, brandId, type, file);
      setBrandDocuments(result.brandDocuments);
      toast.success('Document uploaded');
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to upload document');
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
    }
  }

  const filtered = useMemo(
    () => brands.filter(b => b.name.toLowerCase().includes(query.toLowerCase())),
    [brands, query],
  );

  function toggle(id: number): void {
    setSelected(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    try {
      const result = await updateSellerBrands(sellerId, selected);
      toast.success('Brands updated');
      onSaved(result.brandIds, result.brands);
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update brands');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Tags className="w-4 h-4 text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-900">Associate Brands</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Select the brands <span className="font-medium text-gray-700">{sellerName}</span> is authorized to sell.
          </p>
        </div>

        <div className="px-6 py-3 border-b border-gray-100 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search brands…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[240px]">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
          ) : error ? (
            <p className="px-6 py-8 text-sm text-red-600 text-center">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="px-6 py-8 text-sm text-gray-400 text-center italic">No brands found</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map(brand => {
                const checked = selected.includes(brand.id);
                const docs = brandDocuments[String(brand.id)] ?? { certification: null, other: null };
                return (
                  <li key={brand.id}>
                    <label className="flex items-center gap-3 px-6 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(brand.id)}
                        className="w-4 h-4 rounded accent-indigo-600 cursor-pointer shrink-0"
                      />
                      <div className="w-7 h-7 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                        {brand.logo ? (
                          <img src={brand.logo} alt="" className="w-full h-full object-contain p-1" />
                        ) : (
                          <ImageIcon className="w-3 h-3 text-gray-300" />
                        )}
                      </div>
                      <span className="text-sm text-gray-800">{brand.name}</span>
                    </label>
                    {checked && (
                      <div className="px-6 pb-2.5 pl-16 space-y-1.5">
                        {BRAND_DOCS.map(({ type, label }) => {
                          const slotKey = `${brand.id}-${type}`;
                          return (
                            <BrandDocSlot
                              key={type}
                              label={label}
                              existingUrl={docs[type]}
                              uploading={Boolean(uploading[slotKey])}
                              disabled={Boolean(uploading[slotKey])}
                              inputRef={(el): void => { docInputRefs.current[slotKey] = el; }}
                              onPick={(): void => docInputRefs.current[slotKey]?.click()}
                              onSelect={(e): void => {
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (file) void handleDocUpload(brand.id, type, file);
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-gray-500">{selected.length} selected</span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { void handleSave(); }}
              disabled={saving || loading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
