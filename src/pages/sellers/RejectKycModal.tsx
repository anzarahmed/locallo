import type { JSX } from 'react';
import { useFormik, type FormikHelpers } from 'formik';
import { Loader2, XCircle } from 'lucide-react';
import { rejectKycDocuments, type KycStateResponse } from '../../services/sellerService';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/axios';
import { KYC_DOCS } from '../../lib/constants';
import type { KycDocumentType, KycDocuments } from '../../types';
import { rejectKycSchema, type RejectKycFormValues } from './sellerSchemas';

interface RejectKycModalProps {
  sellerId: string;
  kycDocuments: KycDocuments;
  onClose: () => void;
  onRejected: (result: KycStateResponse) => void;
}

const INITIAL_VALUES: RejectKycFormValues = { documentTypes: [], reason: '' };

export default function RejectKycModal({ sellerId, kycDocuments, onClose, onRejected }: RejectKycModalProps): JSX.Element {
  const toast = useToast();
  const uploadedDocs = KYC_DOCS.filter(doc => Boolean(kycDocuments[doc.type]));

  async function handleSubmit(values: RejectKycFormValues, helpers: FormikHelpers<RejectKycFormValues>): Promise<void> {
    try {
      const result = await rejectKycDocuments(sellerId, values.documentTypes, values.reason);
      toast.success('Documents rejected — seller notified');
      onRejected(result);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : 'Failed to reject documents';
      helpers.setStatus(message);
      toast.error(message);
    }
  }

  const f = useFormik<RejectKycFormValues>({
    initialValues: INITIAL_VALUES,
    validationSchema: rejectKycSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: handleSubmit,
  });

  function toggleType(type: KycDocumentType): void {
    const current = f.values.documentTypes;
    void f.setFieldValue('documentTypes', current.includes(type) ? current.filter(t => t !== type) : [...current, type]);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <form noValidate onSubmit={f.handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Reject KYC documents</h3>
          <p className="text-sm text-gray-500 mt-1">
            The selected documents are removed and the seller is asked to upload them again.
          </p>
        </div>

        <div className="space-y-2">
          {uploadedDocs.map(({ type, label }) => (
            <label key={type} className="flex items-center gap-2.5 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={f.values.documentTypes.includes(type)}
                onChange={(): void => { toggleType(type); }}
                className="w-4 h-4 accent-red-600"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
          {f.submitCount > 0 && typeof f.errors.documentTypes === 'string' && (
            <p className="text-xs text-red-600">{f.errors.documentTypes}</p>
          )}
        </div>

        <div>
          <label htmlFor="reject-reason" className="block text-sm font-medium text-gray-700 mb-1">
            Reason <span className="text-gray-400 font-normal">(optional, shown to the seller)</span>
          </label>
          <textarea
            id="reject-reason"
            name="reason"
            rows={3}
            value={f.values.reason}
            onChange={f.handleChange}
            onBlur={f.handleBlur}
            placeholder="e.g. The PAN card photo is blurry"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {f.touched.reason && f.errors.reason && <p className="text-xs text-red-600 mt-1">{f.errors.reason}</p>}
        </div>

        {typeof f.status === 'string' && <p className="text-xs text-red-600">{f.status}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={f.isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={f.isSubmitting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-60"
          >
            {f.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Reject documents
          </button>
        </div>
      </form>
    </div>
  );
}
