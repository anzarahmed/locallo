import { useEffect, useRef, useState, type JSX } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Loader2, XCircle } from 'lucide-react';
import { getKycDocuments, uploadKycDocument } from '../../services/sellerService';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/axios';
import { canUploadKycDocuments, KYC_DOCUMENT_LABELS, kycFileError, type StagedKycFile } from '../../lib/kyc';
import type { AppLayoutContext } from '../../components/layout/AppLayout';
import type { KycDocumentType, KycDocuments as KycDocumentMap, KycRejection } from '../../types';
import KycUploadSlot from './KycUploadSlot';

interface KycSlot {
  type: KycDocumentType;
  label?: string;
}

interface KycSection {
  title: string;
  description: string;
  required: boolean;
  slots: KycSlot[];
}

type StagedMap = Partial<Record<KycDocumentType, StagedKycFile>>;

const KYC_SECTIONS: KycSection[] = [
  {
    title: 'Aadhaar Card',
    description: 'Upload front and back side',
    required: true,
    slots: [
      { type: 'aadhar',     label: 'Front side' },
      { type: 'aadharBack', label: 'Back side' },
    ],
  },
  { title: 'PAN Card',                 description: 'Upload your PAN card',                          required: true,  slots: [{ type: 'pan' }] },
  { title: 'Registration Certificate', description: 'Upload your business registration certificate', required: false, slots: [{ type: 'registrationCertificate' }] },
  { title: 'Other Document',           description: 'Any other supporting document',                 required: false, slots: [{ type: 'other' }] },
];

const SUBMIT_ORDER: KycDocumentType[] = KYC_SECTIONS.flatMap(section => section.slots.map(slot => slot.type));

const REQUIRED_TYPES: KycDocumentType[] = KYC_SECTIONS
  .filter(section => section.required)
  .flatMap(section => section.slots.map(slot => slot.type));

const REQUIRED_MESSAGE = 'This document is required.';

function slotId(type: KycDocumentType): string {
  return `kyc-slot-${type}`;
}

function revokePreview(entry: StagedKycFile | undefined): void {
  if (entry?.previewUrl) URL.revokeObjectURL(entry.previewUrl);
}

export default function KycDocuments(): JSX.Element {
  const toast = useToast();
  const navigate = useNavigate();
  const { setKycState } = useOutletContext<AppLayoutContext>();
  const [docs, setDocs] = useState<KycDocumentMap | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [rejection, setRejection] = useState<KycRejection | null>(null);
  const [loading, setLoading] = useState(true);
  const [staged, setStaged] = useState<StagedMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const stagedRef = useRef<StagedMap>(staged);

  useEffect(() => {
    stagedRef.current = staged;
  }, [staged]);

  useEffect(() => {
    getKycDocuments()
      .then(data => {
        setDocs(data.kycDocuments);
        setRejection(data.kycRejection ?? null);
        setIsVerified(data.isVerified);
        setKycState(data);
      })
      .catch((err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Failed to load documents'))
      .finally(() => setLoading(false));
  }, []); // toast and setKycState are stable

  useEffect(() => () => Object.values(stagedRef.current).forEach(revokePreview), []);

  const stagedCount = Object.keys(staged).length;
  const readOnly = !canUploadKycDocuments({ isVerified, kycDocuments: docs, kycRejection: rejection });
  const canAddMissing = !isVerified && docs !== null && SUBMIT_ORDER.some(type => !docs[type]);

  useEffect(() => {
    if (stagedCount === 0) return;
    function warn(e: BeforeUnloadEvent): void {
      e.preventDefault();
    }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [stagedCount]);

  function stageFile(type: KycDocumentType, file: File): void {
    const error = kycFileError(file);
    if (error) {
      toast.error(error);
      return;
    }
    const previewUrl = file.type === 'application/pdf' ? null : URL.createObjectURL(file);
    setStaged(prev => {
      revokePreview(prev[type]);
      return { ...prev, [type]: { file, previewUrl } };
    });
  }

  function unstage(type: KycDocumentType): void {
    setStaged(prev => {
      revokePreview(prev[type]);
      const next = { ...prev };
      delete next[type];
      return next;
    });
  }

  function isMissing(type: KycDocumentType): boolean {
    return docs !== null && !docs[type] && staged[type] === undefined;
  }

  async function handleSubmit(): Promise<void> {
    setSubmitAttempted(true);
    const firstMissing = REQUIRED_TYPES.find(isMissing);
    if (firstMissing) {
      document.getElementById(slotId(firstMissing))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const types = SUBMIT_ORDER.filter(type => staged[type] !== undefined);
    if (types.length === 0) {
      toast.error('Please select a document to upload');
      return;
    }
    setSubmitting(true);
    try {
      for (const type of types) {
        const entry = staged[type];
        if (!entry) continue;
        const data = await uploadKycDocument(type, entry.file);
        setDocs(data.kycDocuments);
        setRejection(data.kycRejection ?? null);
        unstage(type);
        setKycState(data);
      }
      toast.success('Documents submitted for verification');
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        toast.info(err.message);
        navigate('/profile', { replace: true });
        return;
      }
      toast.error(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#14817C] px-4 md:px-8 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            aria-label="Back to profile"
            className="shrink-0 p-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-white text-xl font-bold">Documents</h1>
        </div>
      </div>

      <div className="px-4 md:px-8 py-5 pb-10 max-w-3xl mx-auto flex flex-col gap-4">
        {loading || docs === null ? (
          <KycSkeleton />
        ) : (
          <>
            {rejection && <RejectionBanner rejection={rejection} />}

            {KYC_SECTIONS.map(section => (
              <section key={section.title} className="bg-white rounded-2xl shadow-sm p-5">
                <h2 className="text-base font-bold text-gray-900">
                  {section.title}
                  {section.required
                    ? <span className="text-red-500 ml-0.5">*</span>
                    : <span className="text-sm font-normal text-gray-400 ml-1">(Optional)</span>}
                </h2>
                <p className="text-sm text-gray-400 mt-0.5 mb-4">{section.description}</p>
                <div className={section.slots.length > 1 ? 'grid grid-cols-2 gap-3 sm:gap-4' : ''}>
                  {section.slots.map(slot => (
                    <KycUploadSlot
                      key={slot.type}
                      id={slotId(slot.type)}
                      label={slot.label}
                      error={submitAttempted && section.required && isMissing(slot.type) ? REQUIRED_MESSAGE : undefined}
                      serverUrl={docs[slot.type]}
                      staged={staged[slot.type] ?? null}
                      busy={submitting}
                      readOnly={readOnly}
                      locked={isVerified}
                      rejected={rejection?.documentTypes.includes(slot.type) === true && docs[slot.type] === null && staged[slot.type] === undefined}
                      onPick={file => stageFile(slot.type, file)}
                      onRemove={() => unstage(slot.type)}
                    />
                  ))}
                </div>
              </section>
            ))}

            {(!readOnly || canAddMissing) && (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="w-full py-4 rounded-2xl bg-[#14817C] hover:bg-[#106B67] text-white text-base font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 size={18} className="animate-spin" />}
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RejectionBanner({ rejection }: { rejection: KycRejection }): JSX.Element {
  const labels = rejection.documentTypes.map(type => KYC_DOCUMENT_LABELS[type]);
  if (labels.length === 0) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-300 px-4 py-3.5 flex items-start gap-2.5">
        <XCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
        <div className="text-sm text-red-600">
          <p className="font-semibold text-[15px]">Your KYC verification was revoked</p>
          <p className="mt-0.5">Please replace your documents with current, valid copies so we can review them again.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-red-50 border border-red-300 px-4 py-3.5 flex items-start gap-2.5">
      <XCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
      <div className="text-sm text-red-600">
        <p className="font-semibold text-[15px]">Some documents were not accepted: {labels.join(', ')}</p>
        {rejection.reason && <p className="mt-0.5">Reason: {rejection.reason}</p>}
        <p className="mt-0.5">Please upload them again to continue your KYC verification.</p>
      </div>
    </div>
  );
}

function KycSkeleton(): JSX.Element {
  return (
    <>
      {[0, 1, 2].map(i => (
        <div key={i} className="bg-white rounded-2xl shadow-sm p-5 animate-pulse">
          <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-56 bg-gray-100 rounded mb-4" />
          <div className="h-40 bg-gray-100 rounded-2xl" />
        </div>
      ))}
    </>
  );
}
