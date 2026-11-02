import { useRef, useState, type ChangeEvent, type JSX } from 'react';
import { Camera, FileText, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { KYC_ACCEPT, isPdfUrl } from '../../lib/kyc';

interface KycUploadSlotProps {
  label?: string;
  required: boolean;
  url: string | null;
  uploading: boolean;
  disabled: boolean;
  onSelect: (file: File) => void;
}

export default function KycUploadSlot({ label, required, url, uploading, disabled, onSelect }: KycUploadSlotProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  function openPicker(): void {
    if (!disabled && !uploading) inputRef.current?.click();
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onSelect(file);
  }

  const showPdf = url !== null && (isPdfUrl(url) || failedUrl === url);

  return (
    <div className="flex flex-col min-w-0">
      {label && (
        <p className="text-sm font-semibold text-gray-800 mb-2">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </p>
      )}

      <input ref={inputRef} type="file" accept={KYC_ACCEPT} className="hidden" onChange={handleChange} />

      {url === null ? (
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || uploading}
          className="relative w-full h-40 rounded-2xl border-2 border-dashed border-teal-300/70 bg-gray-50 hover:bg-teal-50/40 hover:border-teal-400 transition-colors flex flex-col items-center justify-center gap-2 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <Loader2 size={26} className="text-teal-600 animate-spin" />
          ) : (
            <>
              <span className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center">
                <Camera size={22} className="text-teal-700" />
              </span>
              <span className="text-sm font-semibold text-gray-800">Click to upload</span>
              <span className="text-xs text-gray-400">JPG, PNG, WebP or PDF · max 10 MB</span>
            </>
          )}
        </button>
      ) : (
        <div className="relative w-full h-40 rounded-2xl border border-teal-200 bg-gray-50 overflow-hidden">
          {showPdf ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <FileText size={34} className="text-teal-700" />
              <span className="text-xs text-gray-500">Document uploaded</span>
            </div>
          ) : (
            <img src={url} alt={label ?? 'Document'} onError={() => setFailedUrl(url)} className="w-full h-full object-contain" />
          )}

          {uploading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <Loader2 size={26} className="text-teal-600 animate-spin" />
            </div>
          )}

          <div className="absolute bottom-0 inset-x-0 flex gap-2 p-2 bg-gradient-to-t from-black/50 to-transparent">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-white/90 hover:bg-white px-2 py-1.5 text-xs font-semibold text-gray-700"
            >
              <ExternalLink size={13} /> View
            </a>
            <button
              type="button"
              onClick={openPicker}
              disabled={disabled || uploading}
              className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-teal-600 hover:bg-teal-700 px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              <RefreshCw size={13} /> Replace
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
