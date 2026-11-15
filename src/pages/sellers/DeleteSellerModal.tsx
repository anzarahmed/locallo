import type { JSX } from 'react';
import { useFormik, type FormikHelpers } from 'formik';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import {
  deleteSellerSchema,
  DELETE_SELLER_CONFIRM_WORD,
  type DeleteSellerFormValues,
} from './sellerSchemas';

const DELETED_DATA: string[] = [
  'Seller account, shop profile, photo, working hours and settings',
  'All products and variants, including every product image and thumbnail',
  'All KYC documents (Aadhaar, PAN, registration certificate, others) and brand verification documents',
  'Customer reviews, wishlist entries, product views and offer participation for these products',
  'Product boosts and their payment records',
  'Sales, purchase, expense and ledger (P&L) records, and listing-limit history',
  'Notifications, emails in the queue and all login sessions',
  'Every file stored for this seller in cloud storage (AWS S3)',
];

interface DeleteSellerModalProps {
  sellerName: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteSellerModal({ sellerName, onCancel, onConfirm }: DeleteSellerModalProps): JSX.Element {
  async function handleSubmit(
    _values: DeleteSellerFormValues,
    helpers: FormikHelpers<DeleteSellerFormValues>,
  ): Promise<void> {
    try {
      await onConfirm();
    } finally {
      helpers.setSubmitting(false);
    }
  }

  const formik = useFormik<DeleteSellerFormValues>({
    initialValues: { confirmation: '' },
    validationSchema: deleteSellerSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: handleSubmit,
  });

  const canDelete = formik.values.confirmation === DELETE_SELLER_CONFIRM_WORD && !formik.isSubmitting;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <form
        noValidate
        onSubmit={formik.handleSubmit}
        className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-1">
          Permanently delete {sellerName}?
        </h3>
        <p className="text-sm text-gray-500 text-center mb-4">
          The following will be permanently deleted from the system:
        </p>

        <ul className="text-sm text-gray-700 space-y-1.5 mb-4 list-disc pl-5">
          {DELETED_DATA.map(item => <li key={item}>{item}</li>)}
        </ul>

        <div className="flex gap-2.5 items-start rounded-lg border border-amber-200 bg-amber-50 p-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            This action is <strong>permanent and cannot be undone or reverted</strong>. The data cannot be recovered afterwards.
          </p>
        </div>

        <label htmlFor="confirmation" className="block text-sm text-gray-700 mb-1.5">
          Type <span className="font-mono font-semibold text-red-600">{DELETE_SELLER_CONFIRM_WORD}</span> to confirm
        </label>
        <input
          id="confirmation"
          name="confirmation"
          type="text"
          autoComplete="off"
          autoFocus
          value={formik.values.confirmation}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          disabled={formik.isSubmitting}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
        />
        {formik.touched.confirmation && formik.errors.confirmation && (
          <p className="text-xs text-red-600 mt-1">{formik.errors.confirmation}</p>
        )}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={formik.isSubmitting}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canDelete}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {formik.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {formik.isSubmitting ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </form>
    </div>
  );
}
