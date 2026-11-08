import { useRef, useState, type ChangeEvent, type JSX } from 'react';
import { Camera, FileText, X } from 'lucide-react';
import { KYC_ACCEPT, isPdfUrl, type StagedKycFile } from '../../lib/kyc';

interface KycUploadSlotProps {
  label?: string;
  serverUrl: string | null;
  staged: StagedKycFile | null;
  rejected: boolean;
  busy: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}

export default function KycUploadSlot({ label, serverUrl, staged, rejected, busy, onPick, onRemove }: KycUploadSlotProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  function openPicker(): void {
    if (!busy) inputRef.current?.click();
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onPick(file);
  }

  return (
    <div className="flex flex-col min-w-0">
      {label && <p className="text-sm font-semibold text-gray-800 mb-2">{label}</p>}

      <input ref={inputRef} type="file" accept={KYC_ACCEPT} className="hidden" onChange={handleChange} />

      {staged ? (
        <FilledSlot
          imageUrl={staged.previewUrl}
          fileName={staged.file.name}
          busy={busy}
          onReplace={openPicker}
          onRemove={onRemove}
        />
      ) : serverUrl ? (
        <FilledSlot
          imageUrl={isPdfUrl(serverUrl) || failedUrl === serverUrl ? null : serverUrl}
          fileName="Document uploaded"
          viewUrl={serverUrl}
          busy={busy}
          onReplace={openPicker}
          onImageError={() => setFailedUrl(serverUrl)}
        />
      ) : (
        <button
          type="button"
          onClick={openPicker}
          disabled={busy}
          className={`w-full h-36 rounded-2xl border-2 transition-colors flex flex-col items-center justify-center gap-1.5 px-2 disabled:cursor-not-allowed ${
            rejected
              ? 'border-red-300 bg-red-50/40 hover:bg-red-50'
              : 'border-teal-300/70 bg-gray-50 hover:bg-teal-50/40'
          }`}
        >
          <span className="w-11 h-11 rounded-full bg-teal-100/60 flex items-center justify-center mb-1">
            <Camera size={20} className="text-teal-700" />
          </span>
          <span className="text-sm font-bold text-gray-800">Click to upload</span>
          <span className="text-xs text-gray-400">Image or PDF · max 10 MB</span>
          {rejected && <span className="text-xs font-medium text-red-600 text-center">Not accepted · please upload again</span>}
        </button>
      )}
    </div>
  );
}

interface FilledSlotProps {
  imageUrl: string | null;
  fileName: string;
  viewUrl?: string;
  busy: boolean;
  onReplace: () => void;
  onRemove?: () => void;
  onImageError?: () => void;
}

function FilledSlot({ imageUrl, fileName, viewUrl, busy, onReplace, onRemove, onImageError }: FilledSlotProps): JSX.Element {
  const preview = imageUrl ? (
    <img src={imageUrl} alt={fileName} onError={onImageError} className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-3">
      <FileText size={32} className="text-teal-700" />
      <span className="text-xs text-gray-500 truncate max-w-full">{fileName}</span>
    </div>
  );

  return (
    <div className="relative w-full h-36">
      <div className="w-full h-full rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden">
        {viewUrl ? (
          <a href={viewUrl} target="_blank" rel="noopener noreferrer" title="View document" className="block w-full h-full">
            {preview}
          </a>
        ) : (
          preview
        )}
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          aria-label="Remove file"
          className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow ring-2 ring-white disabled:opacity-60"
        >
          <X size={15} strokeWidth={3} />
        </button>
      )}

      <button
        type="button"
        onClick={onReplace}
        disabled={busy}
        className="absolute bottom-2 right-2 rounded-full bg-gray-700/75 hover:bg-gray-800/85 px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        Replace
      </button>
    </div>
  );
}
