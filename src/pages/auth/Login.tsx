import { useFormik, type FormikHelpers } from 'formik';
import { Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { requestOtpSchema, type RequestOtpValues } from '../../validation/authSchemas';
import { requestOtp } from '../../services/authService';
import { ApiError } from '../../lib/axios';
import { useToast } from '../../hooks/useToast';
import type { JSX } from 'react';

const COUNTRY_CODES = [
  { code: '+91', label: '+91' },
  { code: '+1',  label: '+1'  },
  { code: '+44', label: '+44' },
  { code: '+971',label: '+971'},
  { code: '+65', label: '+65' },
];

const initialValues: RequestOtpValues = {
  countryCode: '+91',
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
      await requestOtp(values.countryCode, values.phoneNumber);
      toast.success('OTP sent successfully');
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
            className={`flex items-center bg-white border rounded-2xl overflow-hidden transition-colors ${
              formik.touched.phoneNumber && formik.errors.phoneNumber
                ? 'border-red-400'
                : 'border-gray-200 focus-within:border-orange-400'
            }`}
          >
            <div className="flex items-center gap-1.5 pl-4 pr-3 py-4 border-r border-gray-200 shrink-0">
              <Phone size={15} className="text-gray-400" />
              <select
                name="countryCode"
                value={formik.values.countryCode}
                onChange={formik.handleChange}
                className="text-sm text-gray-700 bg-transparent outline-none cursor-pointer"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="tel"
              name="phoneNumber"
              placeholder="Phone number"
              value={formik.values.phoneNumber}
              onChange={formik.handleChange}
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
          className="w-full py-4 rounded-2xl text-white font-semibold text-sm tracking-wide transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
          style={{
            background: 'linear-gradient(135deg, #FFB300 0%, #FF6200 50%, #E53000 100%)',
          }}
        >
          {formik.isSubmitting ? (
            <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <span>Send OTP &nbsp;→</span>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
