import { type JSX } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useFormik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import AuthField from '../../components/ui/AuthField';

// ── Schema ────────────────────────────────────────────────────────────────────

const forgotSchema = Yup.object({
  email: Yup.string().trim().email('Enter a valid email address').required('Email is required'),
});

type ForgotValues = Yup.InferType<typeof forgotSchema>;

// ── Component ─────────────────────────────────────────────────────────────────

export default function ForgotPassword(): JSX.Element {
  async function handleSubmit(
    _values: ForgotValues,
    { setSubmitting, setStatus }: FormikHelpers<ForgotValues>,
  ): Promise<void> {
    try {
      // Stub: replace with real API call
      await new Promise<void>(r => setTimeout(r, 1000));
      setStatus('sent');
    } catch {
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  }

  const f = useFormik<ForgotValues>({
    initialValues: { email: '' },
    validationSchema: forgotSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: handleSubmit,
  });

  const sent = f.status === 'sent';
  const serverError = f.status === 'error';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
              <span className="text-white font-bold text-xl">L</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Forgot password?</h1>
            <p className="text-sm text-gray-500 mt-1 text-center">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          {sent ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle2 className="w-14 h-14 text-green-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Check your inbox</h2>
              <p className="text-sm text-gray-500 mb-6">
                We sent a password reset link to <strong>{f.values.email}</strong>
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              {serverError && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
                  Failed to send reset email. Please try again.
                </div>
              )}

              <form onSubmit={f.handleSubmit} noValidate className="space-y-4">
                <AuthField
                  label="Email address"
                  name="email"
                  type="email"
                  placeholder="admin@localo.com"
                  value={f.values.email}
                  onChange={f.handleChange}
                  onBlur={f.handleBlur}
                  touched={f.touched.email}
                  error={f.errors.email}
                />

                <button
                  type="submit"
                  disabled={f.isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {f.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {f.isSubmitting ? 'Sending...' : 'Send reset link'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
