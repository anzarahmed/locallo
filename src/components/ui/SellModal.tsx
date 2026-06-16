import { type JSX } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { ShoppingBag, Loader2 } from 'lucide-react';
import { inputCls } from '../../lib/classUtils';

interface SellModalProps {
  itemName: string;
  currentStock: number;
  loading: boolean;
  onConfirm: (quantity: number) => void;
  onClose: () => void;
}

export default function SellModal({
  itemName,
  currentStock,
  loading,
  onConfirm,
  onClose,
}: SellModalProps): JSX.Element {
  const schema = Yup.object({
    quantity: Yup.number()
      .typeError('Enter a valid number')
      .integer('Must be a whole number')
      .min(1, 'Must sell at least 1')
      .max(currentStock, `Cannot exceed available stock (${currentStock})`)
      .required('Quantity is required'),
  });

  const formik = useFormik({
    initialValues: { quantity: '' },
    validationSchema: schema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: (values) => {
      onConfirm(Number(values.quantity));
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'linear-gradient(135deg, #26B8B2 0%, #14817C 100%)' }}
        >
          <ShoppingBag size={20} className="text-white" />
        </div>

        <h3 className="text-base font-bold text-gray-800 text-center mb-1">Mark as Sold</h3>
        <p className="text-sm text-gray-500 text-center mb-1 line-clamp-2">{itemName}</p>
        <p className="text-xs text-teal-600 font-semibold text-center mb-5">
          Available: {currentStock} unit{currentStock !== 1 ? 's' : ''}
        </p>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Quantity Sold <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            max={currentStock}
            placeholder="Enter quantity"
            className={inputCls(!!formik.touched.quantity && !!formik.errors.quantity)}
            {...formik.getFieldProps('quantity')}
          />
          {formik.touched.quantity && formik.errors.quantity && (
            <p className="text-xs text-rose-500 mt-1">{formik.errors.quantity}</p>
          )}

          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => { void formik.submitForm(); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #1B9E98 0%, #157A75 100%)' }}
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Saving…' : 'Confirm Sale'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
