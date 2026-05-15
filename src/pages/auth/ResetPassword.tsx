import { type JSX } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useFormik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import AuthField from '../../components/ui/AuthField';

// ── Schema ────────────────────────────────────────────────────────────────────

const resetSchema = Yup.object({
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Must contain at least one uppercase letter')
    .matches(/[0-9]/, 'Must contain at least one number')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords do not match')
    .required('Please confirm your password'),
});

type ResetValues = Yup.InferType<typeof resetSchema>;

// ── Strength hints ────────────────────────────────────────────────────────────

interface StrengthHint {
  label: string;
  test: (pw: string) => boolean;
}

const STRENGTH_HINTS: StrengthHint[] = [
  { label: 'At least 8 characters',   test: (pw): boolean => pw.length >= 8 },
  { label: 'One uppercase letter',     test: (pw): boolean => /[A-Z]/.test(pw) },
  { label: 'One number',               test: (pw): boolean => /[0-9]/.test(pw) },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ResetPassword(): JSX.Element {
  const navigate = useNavigate();

  async function handleSubmit(
    _values: ResetValues,
    { setSubmitting, setStatus }: FormikHelpers<ResetValues>,
  ): Promise<void> {
    try {
      // Stub: replace with real API call using token from URL search params
      await new Promise<void>(r => setTimeout(r, 1000));
      setStatus('done');
    } catch {
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  }

  const f = useFormik<ResetValues>({
    initialValues: { password: '', confirmPassword: '' },
    validationSchema: resetSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: handleSubmit,
  });

  const done = f.status === 'done';
  const serverError = f.status === 'error';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
              <span className="text-white font-bold text-xl">L</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
            <p className="text-sm text-gray-500 mt-1">Must be at least 8 characters</p>
          </div>

          {done ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle2 className="w-14 h-14 text-green-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Password reset!</h2>
              <p className="text-sm text-gray-500 mb-6">
                Your password has been changed successfully.
              </p>
              <button
                onClick={(): void => { navigate('/login'); }}
                className="w-full px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              {serverError && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
                  Failed to reset password. The link may have expired.
                </div>
              )}

              <form onSubmit={f.handleSubmit} noValidate className="space-y-4">
                <AuthField
                  label="New password"
                  name="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={f.values.password}
                  onChange={f.handleChange}
                  onBlur={f.handleBlur}
                  touched={f.touched.password}
                  error={f.errors.password}
                />

                <AuthField
                  label="Confirm password"
                  name="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={f.values.confirmPassword}
                  onChange={f.handleChange}
                  onBlur={f.handleBlur}
                  touched={f.touched.confirmPassword}
                  error={f.errors.confirmPassword}
                />

                {/* Password strength hints */}
                {f.values.password.length > 0 && (
                  <ul className="space-y-1" aria-label="Password requirements">
                    {STRENGTH_HINTS.map(({ label, test }) => {
                      const pass = test(f.values.password);
                      return (
                        <li
                          key={label}
                          className={`text-xs flex items-center gap-1.5 ${pass ? 'text-green-600' : 'text-gray-400'}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${pass ? 'bg-green-500' : 'bg-gray-300'}`} />
                          {label}
                        </li>
                      );
                    })}
                  </ul>
                )}

                <button
                  type="submit"
                  disabled={f.isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {f.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {f.isSubmitting ? 'Resetting...' : 'Reset password'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
