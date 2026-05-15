import { lazy, Suspense, type JSX } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, MapPin } from 'lucide-react';
import { useFormik, type FormikHelpers } from 'formik';
import { MOCK_SELLERS } from './sellerData';
import AuthField from '../../components/ui/AuthField';
import { sellerSchema, type SellerFormValues } from './sellerSchemas';

export default function SellerForm(): JSX.Element {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const existing = isEdit ? MOCK_SELLERS.find(s => s.id === Number(id)) : null;

  async function handleSubmit(
    values: SellerFormValues,
    { setSubmitting, setStatus }: FormikHelpers<SellerFormValues>,
  ): Promise<void> {
    try {
      // Stub: replace with real API call
      await new Promise<void>(r => setTimeout(r, 800));
      console.log('Seller payload:', values);
      navigate('/sellers');
    } catch {
      setStatus('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const f = useFormik<SellerFormValues>({
    initialValues: {
      name: existing?.name ?? '',
      email: existing?.email ?? '',
      phone: existing?.phone ?? '',
      businessName: existing?.businessName ?? '',
      status: existing?.status ?? 'pending',
      latitude: existing?.latitude as number,
      longitude: existing?.longitude as number,
    },
    validationSchema: sellerSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: handleSubmit,
  });

  return (
    <div className="max-w-2xl">
      <button
        onClick={(): void => { navigate('/sellers'); }}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to sellers
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <h2 className="text-base font-semibold text-gray-900">
          {isEdit ? 'Edit Seller' : 'Add New Seller'}
        </h2>

        {typeof f.status === 'string' && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
            {f.status}
          </div>
        )}

        <form onSubmit={f.handleSubmit} noValidate className="space-y-6">
          {/* Basic info */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AuthField
                label="Full Name" name="name" placeholder="Ravi Kumar" required
                value={f.values.name} onChange={f.handleChange} onBlur={f.handleBlur}
                touched={f.touched.name} error={f.errors.name}
              />
              <AuthField
                label="Email" name="email" type="email" placeholder="ravi@example.com" required
                value={f.values.email} onChange={f.handleChange} onBlur={f.handleBlur}
                touched={f.touched.email} error={f.errors.email}
              />
              <AuthField
                label="Phone" name="phone" placeholder="+91 98765 43210" required
                value={f.values.phone} onChange={f.handleChange} onBlur={f.handleBlur}
                touched={f.touched.phone} error={f.errors.phone}
              />
              <AuthField
                label="Business Name" name="businessName" placeholder="Urban Eats" required
                value={f.values.businessName} onChange={f.handleChange} onBlur={f.handleBlur}
                touched={f.touched.businessName} error={f.errors.businessName}
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Status
            </h3>
            <select
              id="status"
              name="status"
              value={f.values.status}
              onChange={f.handleChange}
              onBlur={f.handleBlur}
              className="w-full sm:w-64 px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Seller Location <span className="text-red-500">*</span>
            </h3>
            <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              Search an address or click the map to pin the exact location.
            </p>
            <Suspense
              fallback={
                <div className="h-72 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                </div>
              }
            >
              <LocationPicker
                latitude={f.values.latitude}
                longitude={f.values.longitude}
                onChange={(lat: number, lng: number): void => {
                  void f.setFieldValue('latitude', lat);
                  void f.setFieldValue('longitude', lng);
                  void f.setFieldTouched('latitude', true, false);
                  void f.setFieldTouched('longitude', true, false);
                }}
              />
            </Suspense>
            {f.touched.latitude === true && typeof f.errors.latitude === 'string' && (
              <p className="mt-2 text-xs text-red-600 flex items-center gap-1" role="alert">
                <MapPin className="w-3.5 h-3.5" />
                {f.errors.latitude}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={(): void => { navigate('/sellers'); }}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={f.isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {f.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {f.isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Seller'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
