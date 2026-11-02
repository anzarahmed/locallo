import { useEffect, useState, type JSX } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { getKycDocuments, uploadKycDocument } from '../../services/sellerService';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/axios';
import { hasRequiredKycDocuments, KYC_DOCUMENT_LABELS } from '../../lib/kyc';
import type { KycDocumentType, KycDocuments as KycDocumentMap, KycRejection } from '../../types';
import KycUploadSlot from './KycUploadSlot';

interface KycSlot {
  type: KycDocumentType;
  label?: string;
  required: boolean;
}

interface KycSection {
  title: string;
  description: string;
  slots: KycSlot[];
}

const KYC_SECTIONS: KycSection[] = [
  {
    title: 'Aadhaar Card',
    description: 'Upload front and back side',
    slots: [
      { type: 'aadhar',     label: 'Front side', required: true },
      { type: 'aadharBack', label: 'Back side',  required: true },
    ],
  },
  { title: 'PAN Card',                 description: 'Upload your PAN card',                          slots: [{ type: 'pan', required: true }] },
  { title: 'Registration Certificate', description: 'Upload your business registration certificate', slots: [{ type: 'registrationCertificate', required: false }] },
  { title: 'Other Document',           description: 'Any other supporting document',                 slots: [{ type: 'other', required: false }] },
];

export default function KycDocuments(): JSX.Element {
  const toast = useToast();
  const navigate = useNavigate();
  const [docs, setDocs] = useState<KycDocumentMap | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [rejection, setRejection] = useState<KycRejection | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState<KycDocumentType | null>(null);

  useEffect(() => {
    getKycDocuments()
      .then(data => {
        setDocs(data.kycDocuments);
        setRejection(data.kycRejection ?? null);
        setIsVerified(data.isVerified);
        if (data.isVerified) toast.info('Your KYC is already verified');
      })
      .catch((err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Failed to load documents'))
      .finally(() => setLoading(false));
  }, []); // toast is stable

  async function handleSelect(type: KycDocumentType, file: File): Promise<void> {
    setUploadingType(type);
    try {
      const data = await uploadKycDocument(type, file);
      setDocs(data.kycDocuments);
      setRejection(data.kycRejection ?? null);
      toast.success(`${KYC_DOCUMENT_LABELS[type]} uploaded`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        toast.info(err.message);
        navigate('/profile', { replace: true });
        return;
      }
      toast.error(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setUploadingType(null);
    }
  }

  if (isVerified) return <Navigate to="/profile" replace />;

  const complete = hasRequiredKycDocuments(docs);

  return (
    <div className="min-h-screen bg-gray-100">
      <div
        className="px-5 md:px-8 pt-8 pb-16"
        style={{
          background: 'linear-gradient(150deg, #26B8B2 0%, #1A9E98 45%, #14817C 100%)',
          borderRadius: '0 0 28px 28px',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            aria-label="Back to profile"
            className="shrink-0 p-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-white text-xl font-bold">Documents</h1>
            <p className="text-white/70 text-sm mt-0.5">Upload your KYC documents to get verified</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 -mt-10 relative z-10 pb-10 max-w-3xl mx-auto flex flex-col gap-4">
        {loading || docs === null ? (
          <KycSkeleton />
        ) : (
          <>
            {rejection && <RejectionBanner rejection={rejection} />}

            {KYC_SECTIONS.map(section => (
              <section key={section.title} className="bg-white rounded-2xl shadow-sm p-5">
                <h2 className="text-base font-bold text-gray-900">
                  {section.title}
                  {section.slots.length === 1 && section.slots[0].required && <span className="text-red-500 ml-0.5">*</span>}
                </h2>
                <p className="text-sm text-gray-400 mt-0.5 mb-4">{section.description}</p>
                <div className={section.slots.length > 1 ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : ''}>
                  {section.slots.map(slot => (
                    <KycUploadSlot
                      key={slot.type}
                      label={slot.label}
                      required={slot.required}
                      url={docs[slot.type]}
                      uploading={uploadingType === slot.type}
                      disabled={uploadingType !== null && uploadingType !== slot.type}
                      rejected={rejection?.documentTypes.includes(slot.type) === true && docs[slot.type] === null}
                      onSelect={file => void handleSelect(slot.type, file)}
                    />
                  ))}
                </div>
              </section>
            ))}

            {complete ? (
              <div className="rounded-2xl bg-teal-50 border border-teal-200 px-4 py-3 flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-teal-700 shrink-0 mt-0.5" />
                <p className="text-sm text-teal-800">
                  All required documents uploaded. Our team will review and verify your KYC.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Upload Aadhaar front, Aadhaar back and PAN card to send your KYC for verification.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RejectionBanner({ rejection }: { rejection: KycRejection }): JSX.Element {
  const labels = rejection.documentTypes.map(type => KYC_DOCUMENT_LABELS[type]);
  return (
    <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2.5">
      <XCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
      <div className="text-sm text-red-800">
        <p className="font-semibold">Some documents were not accepted: {labels.join(', ')}</p>
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
