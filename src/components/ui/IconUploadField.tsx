import { useState, type ChangeEvent, type JSX } from 'react';
import { Loader2, Image as ImageIcon, X } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/axios';

interface IconUploadFieldProps {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  upload: (file: File) => Promise<{ url: string }>;
}

export default function IconUploadField({ label, value, onChange, upload }: IconUploadFieldProps): JSX.Element {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const { url } = await upload(file);
      onChange(url);
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to upload icon');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {value ? (
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
            <img src={value} alt="Icon" className="w-full h-full object-contain p-1.5" />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <label className={`inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 cursor-pointer hover:text-indigo-700 ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
            <input type="file" accept="image/jpeg,image/png,image/svg+xml" onChange={(e) => { void handleFileChange(e); }} className="hidden" />
            {uploading ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</> : 'Replace icon'}
          </label>
        </div>
      ) : (
        <label className={`flex flex-col items-center justify-center gap-1.5 w-full rounded-lg border-2 border-dashed border-gray-200 py-5 cursor-pointer hover:border-indigo-400 transition-colors ${uploading ? 'pointer-events-none opacity-70' : ''}`}>
          <input type="file" accept="image/jpeg,image/png,image/svg+xml" onChange={(e) => { void handleFileChange(e); }} className="hidden" />
          {uploading ? (
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
          ) : (
            <ImageIcon className="w-5 h-5 text-gray-400" />
          )}
          <span className="text-xs text-gray-500">
            {uploading ? 'Uploading…' : 'SVG, JPG or PNG'}
          </span>
        </label>
      )}
    </div>
  );
}
