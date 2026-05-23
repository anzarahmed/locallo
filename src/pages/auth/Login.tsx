import { type JSX } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useFormik, type FormikHelpers } from 'formik';
import { useAuth } from '../../hooks/useAuth';
import AuthField from '../../components/ui/AuthField';
import { loginSchema, type LoginValues } from './authSchemas';

// ── Component ─────────────────────────────────────────────────────────────────

export default function Login(): JSX.Element {
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(
    values: LoginValues,
    { setSubmitting, setStatus }: FormikHelpers<LoginValues>,
  ): Promise<void> {
    try {
      await login(values.email, values.password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const f = useFormik<LoginValues>({
    initialValues: { email: '', password: '' },
    validationSchema: loginSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: handleSubmit,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <img src="/src/assets/logo.png" alt="Localo" className="h-16 w-auto mb-4 object-contain" />
            <h1 className="text-2xl font-bold text-gray-900">Welcome</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to your admin account</p>
          </div>

          {typeof f.status === 'string' && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
              {f.status}
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

            <AuthField
              label="Password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={f.values.password}
              onChange={f.handleChange}
              onBlur={f.handleBlur}
              touched={f.touched.password}
              error={f.errors.password}
            />

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={f.isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {f.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {f.isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
