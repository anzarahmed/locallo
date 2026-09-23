import { useFormik, type FormikHelpers } from 'formik';
import { Phone } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { requestOtpSchema, type RequestOtpValues } from '../../validation/authSchemas';
import { requestOtp } from '../../services/authService';
import { ApiError } from '../../lib/axios';
import { useToast } from '../../hooks/useToast';
import type { JSX } from 'react';
import { COUNTRY_CODE } from '../../constants';

const initialValues: RequestOtpValues = {
  countryCode: COUNTRY_CODE,
  phoneNumber: '',
};

export default function Login(): JSX.Element {
  const navigate = useNavigate();
  const toast = useToast();

  async function onSubmit(
    values: RequestOtpValues,
    helpers: FormikHelpers<RequestOtpValues>,
  ): Promise<void> {
    try {
      // TEMPORARY: SMS delivery isn't live yet, so surface the OTP in the toast for testing.
      // Remove this once MSG91 delivery is confirmed working.
      const { otp } = await requestOtp(values.countryCode, values.phoneNumber);
      toast.success(`OTP sent successfully: ${otp}`);
      navigate('/verify-otp', {
        state: { countryCode: values.countryCode, phoneNumber: values.phoneNumber },
      });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
      );
    } finally {
      helpers.setSubmitting(false);
    }
  }

  const formik = useFormik({
    initialValues,
    validationSchema: requestOtpSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit,
  });

  return (
    <AuthLayout>
      <h2 className="text-[19px] font-bold text-gray-900 mb-1">Enter your phone number</h2>
      <p className="text-sm text-gray-400 mb-7">We'll send you a verification code</p>

      <form noValidate onSubmit={formik.handleSubmit} className="flex flex-col gap-4">
        {/* Phone input */}
        <div>
          <div
            className={`flex items-center bg-white border rounded-full overflow-hidden transition-colors ${
              formik.touched.phoneNumber && formik.errors.phoneNumber
                ? 'border-red-400'
                : 'border-gray-200 focus-within:border-teal-500'
            }`}
          >
            <div className="flex items-center gap-1.5 pl-4 pr-3 py-4 border-r border-gray-200 shrink-0">
              <Phone size={15} className="text-gray-400" />
              <span className="text-sm text-gray-700">{COUNTRY_CODE}</span>
            </div>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              name="phoneNumber"
              placeholder="Phone number"
              value={formik.values.phoneNumber}
              onChange={(e) =>
                formik.setFieldValue(
                  'phoneNumber',
                  e.target.value.replace(/\D/g, '').slice(0, 10),
                )
              }
              onBlur={formik.handleBlur}
              className="flex-1 px-4 py-4 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
            />
          </div>
          {formik.touched.phoneNumber && formik.errors.phoneNumber && (
            <p className="mt-1.5 text-xs text-red-500 pl-1">{formik.errors.phoneNumber}</p>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={formik.isSubmitting}
          className="w-full py-4 rounded-full text-white font-semibold text-sm tracking-wide transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
          style={{
            background: 'linear-gradient(135deg, #26B8B2 0%, #1A9E98 50%, #14817C 100%)',
          }}
        >
          {formik.isSubmitting ? (
            <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <span>Send OTP &nbsp;→</span>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-gray-400 leading-relaxed">
        By continuing you agree to our{' '}
        <Link to="/pages/terms-and-conditions" className="text-teal-600 font-medium hover:underline">
          Terms &amp; Conditions
        </Link>{' '}
        and{' '}
        <Link to="/pages/privacy-policy" className="text-teal-600 font-medium hover:underline">
          Privacy Policy
        </Link>
      </p>
    </AuthLayout>
  );
}
