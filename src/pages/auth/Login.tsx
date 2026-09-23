import { useRef, useState, type JSX } from 'react';
import logoUrl from '../../assets/logo.png';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useFormik, type FormikHelpers } from 'formik';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import type ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from '../../hooks/useAuth';
import AuthField from '../../components/ui/AuthField';
import RecaptchaV2 from '../../components/ui/RecaptchaV2';
import { loginSchema, type LoginValues } from './authSchemas';
import { ApiError } from '../../lib/axios';

const CAPTCHA_V2_REQUIRED = 'captcha_v2_required';

// ── Component ─────────────────────────────────────────────────────────────────

export default function Login(): JSX.Element {
  const { login } = useAuth();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const navigate = useNavigate();
  const [needsCaptchaV2, setNeedsCaptchaV2] = useState(false);
  const [captchaV2Token, setCaptchaV2Token] = useState<string | null>(null);
  const recaptchaV2Ref = useRef<ReCAPTCHA>(null);

  async function handleSubmit(
    values: LoginValues,
    { setSubmitting, setStatus }: FormikHelpers<LoginValues>,
  ): Promise<void> {
    if (needsCaptchaV2 && !captchaV2Token) {
      setStatus('Please complete the verification below to continue.');
      setSubmitting(false);
      return;
    }

    try {
      let captchaToken: string | undefined;
      if (needsCaptchaV2) {
        captchaToken = captchaV2Token as string;
      } else {
        try {
          captchaToken = await executeRecaptcha?.('login');
        } catch {
          captchaToken = undefined;
        }
      }
      await login(values.email, values.password, captchaToken, needsCaptchaV2 ? 'v2' : 'v3');
      navigate('/dashboard');
    } catch (err: unknown) {
      if (err instanceof ApiError && err.errors?.includes(CAPTCHA_V2_REQUIRED)) {
        setNeedsCaptchaV2(true);
        setCaptchaV2Token(null);
        recaptchaV2Ref.current?.reset();
        setStatus('We could not verify you automatically. Please complete the challenge below.');
      } else {
        setStatus(err instanceof Error ? err.message : 'Login failed. Please try again.');
      }
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
            <img src={logoUrl} alt="Localo" className="h-16 w-auto mb-4 object-contain" />
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

            {needsCaptchaV2 && <RecaptchaV2 ref={recaptchaV2Ref} onChange={setCaptchaV2Token} />}

            <button
              type="submit"
              disabled={f.isSubmitting || (needsCaptchaV2 && !captchaV2Token)}
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
