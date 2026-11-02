import { useRef, type JSX, type ChangeEvent } from 'react';
import { IdCard, Camera, Upload, Loader2, ExternalLink, X, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AADHAAR_SIDES, type AadhaarSide } from '../../lib/constants';

export interface AadhaarSideState {
  url: string | null;
  stagedFile?: File;
}

interface AadhaarDocCardProps {
  sides: Record<AadhaarSide, AadhaarSideState>;
  uploadingSide?: AadhaarSide | null;
  disabled?: boolean;
  onFile: (side: AadhaarSide, file: File) => void;
  onCapture: (side: AadhaarSide) => void;
  onClear?: (side: AadhaarSide) => void;
  required?: boolean;
}

interface SideSlotProps {
  label: string;
  state: AadhaarSideState;
  uploading: boolean;
  disabled: boolean;
  onFile: (file: File) => void;
  onCapture: () => void;
  onClear?: () => void;
  required: boolean;
}

function SideSlot({ label, state, uploading, disabled, onFile, onCapture, onClear, required }: SideSlotProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { url, stagedFile } = state;
  const present = Boolean(url || stagedFile);
  const busy = disabled || uploading;

  function handleSelect(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onFile(file);
  }

  return (
    <div className={`flex flex-col gap-2 rounded-lg border p-2.5 ${present ? 'border-emerald-200 bg-emerald-50/40' : 'border-dashed border-gray-300 bg-white'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-gray-700">
          {label}{required && <span className="text-red-500">*</span>}
        </p>
        {present && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-label="Uploaded" />}
      </div>

      <div className="h-20 rounded-md overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
        {uploading ? (
          <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
        ) : stagedFile ? (
          <div className="flex flex-col items-center gap-1 text-indigo-500">
            <FileText className="w-5 h-5" />
          </div>
        ) : url ? (
          <img src={url} alt={`Aadhaar ${label}`} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-gray-400">
            <IdCard className="w-6 h-6" />
            <span className="text-[10px]">{label}</span>
          </div>
        )}
      </div>

      <div className="min-h-4 text-xs truncate">
        {stagedFile ? (
          <span className="text-indigo-600">{stagedFile.name} · pending save</span>
        ) : url ? (
          <a href={url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-1">
            View <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-gray-400">Not uploaded</span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleSelect} />
        <button
          type="button" disabled={busy} onClick={(): void => inputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          {present ? 'Replace' : 'Upload'}
        </button>
        <button
          type="button" disabled={busy} onClick={onCapture} title={`Capture ${label.toLowerCase()} with camera`}
          className="p-1.5 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>
        {stagedFile && onClear && (
          <button
            type="button" disabled={busy} onClick={onClear} title="Remove selected file"
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function AadhaarDocCard({
  sides, uploadingSide = null, disabled = false, onFile, onCapture, onClear, required = true,
}: AadhaarDocCardProps): JSX.Element {
  const presentCount = AADHAAR_SIDES.filter(({ type }) => sides[type].url || sides[type].stagedFile).length;
  const complete = presentCount === 2;
  const missingSide = presentCount === 1
    ? AADHAAR_SIDES.find(({ type }) => !sides[type].url && !sides[type].stagedFile)
    : undefined;

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-3 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-700">
            Aadhaar Card{required && <span className="text-red-500">*</span>}
          </p>
          {required && (
            <p className="text-xs text-gray-400 mt-0.5">
              Upload both the front and back of the card. One side alone is not a complete submission.
            </p>
          )}
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border ${
            complete
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : presentCount === 0 && !required
                ? 'bg-gray-50 text-gray-500 border-gray-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          {complete ? 'Both sides uploaded' : presentCount === 0 && !required ? 'Not added' : `${presentCount} of 2 sides`}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {AADHAAR_SIDES.map(({ type, label }) => (
          <SideSlot
            key={type}
            label={label}
            state={sides[type]}
            uploading={uploadingSide === type}
            disabled={disabled}
            onFile={(file): void => { onFile(type, file); }}
            onCapture={(): void => { onCapture(type); }}
            onClear={onClear ? (): void => { onClear(type); } : undefined}
            required={required}
          />
        ))}
      </div>

      {missingSide && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            {missingSide.label} missing. Aadhaar isn't complete until both sides are uploaded.
          </span>
        </div>
      )}
    </div>
  );
}
