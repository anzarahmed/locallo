import {
  useRef,
  useState,
  useEffect,
  type JSX,
  type KeyboardEvent,
  type ClipboardEvent,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { verifyOtp } from '../../services/authService';
import { ApiError } from '../../lib/axios';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

const RESEND_COOLDOWN = 30;

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

interface LocationState {
  countryCode: string;
  phoneNumber: string;
}

export default function VerifyOtp(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();
  const state = location.state as LocationState | null;

  const [digits, setDigits] = useState(['', '', '', '']);
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [success, setSuccess] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [lockSeconds, setLockSeconds] = useState(0);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([null, null, null, null]);

  useEffect(() => {
    if (!state) navigate('/login', { replace: true });
  }, [state, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (lockSeconds <= 0) return;
    const t = setTimeout(() => setLockSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [lockSeconds]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const locked = lockSeconds > 0;

  function applyRateLimit(err: ApiError): void {
    const retryAfter = err.numberField('retryAfterSeconds') ?? RESEND_COOLDOWN;
    setLockSeconds(retryAfter);
    setCooldown(retryAfter);
    setAttemptsLeft(null);
  }

  function handleDigitChange(index: number, value: string): void {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setHasError(false);
    if (digit && index < 3) inputRefs.current[index + 1]?.focus();
    if (next.every((d) => d !== '') && digit) void submitOtp(next.join(''));
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>): void {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) {
      setDigits(pasted.split(''));
      inputRefs.current[3]?.focus();
      void submitOtp(pasted);
    }
  }

  async function submitOtp(otp: string): Promise<void> {
    if (!state) return;
    setLoading(true);
    setHasError(false);
    try {
      const { token, seller } = await verifyOtp(state.countryCode, state.phoneNumber, otp);
      setSuccess(true);
      toast.success('Phone number verified successfully');
      setTimeout(() => {
        login(token, seller);
        navigate('/dashboard', { replace: true });
      }, 700);
    } catch (err) {
      setHasError(true);
      toast.error(
        err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
      );
      setDigits(['', '', '', '']);
      if (err instanceof ApiError && err.status === 429) {
        applyRateLimit(err);
      } else {
        setAttemptsLeft(err instanceof ApiError ? err.numberField('attemptsLeft') : null);
        inputRefs.current[0]?.focus();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend(): Promise<void> {
    if (cooldown > 0 || !state) return;
    try {
      const { requestOtp } = await import('../../services/authService');
      // TEMPORARY: SMS delivery isn't live yet, so surface the OTP in the toast for testing.
      // Remove this once MSG91 delivery is confirmed working.
      const { otp } = await requestOtp(state.countryCode, state.phoneNumber);
      setCooldown(RESEND_COOLDOWN);
      setDigits(['', '', '', '']);
      setHasError(false);
      setAttemptsLeft(null);
      toast.success(`OTP resent successfully: ${otp}`);
      inputRefs.current[0]?.focus();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to resend OTP. Please try again.',
      );
      if (err instanceof ApiError && err.status === 429) {
        setCooldown(err.numberField('retryAfterSeconds') ?? RESEND_COOLDOWN);
      }
    }
  }

  const displayPhone = state ? `${state.countryCode} ${state.phoneNumber}` : '';

  return (
    <AuthLayout>
      <h2 className="text-[19px] font-bold text-gray-900 mb-1">Verify your number</h2>
      <p className="text-sm text-gray-400 mb-10">
        Enter the 4-digit code sent to{' '}
        <span className="font-medium text-gray-600">{displayPhone}</span>
      </p>

      {/* OTP circles */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleDigitChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            disabled={loading || success || locked}
            className={`w-16 h-16 text-center text-xl font-semibold rounded-2xl border-2 outline-none transition-all disabled:opacity-70
              ${
                success
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
                  : hasError
                    ? 'border-red-300 bg-red-50 text-red-600'
                    : digit
                      ? 'border-teal-500 bg-white text-gray-800'
                      : 'border-gray-200 bg-white text-gray-800 focus:border-teal-500'
              }`}
          />
        ))}
      </div>

      {locked ? (
        <p className="text-center text-sm text-red-600 mb-6">
          Too many incorrect attempts. Try again in {formatCountdown(lockSeconds)}.
        </p>
      ) : (
        attemptsLeft !== null && hasError && (
          <p className="text-center text-sm text-red-600 mb-6">
            {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} left
          </p>
        )
      )}

      {/* Success checkmark */}
      {success && (
        <div className="flex items-center justify-center mb-6">
          <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path
                d="M2 6.5l3.5 3.5 5.5-6"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Change number */}
      <div className="text-center mb-3">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors cursor-pointer"
        >
          Change phone number
        </button>
      </div>

      {/* Resend */}
      <div className="text-center">
        {cooldown > 0 ? (
          <span className="text-sm text-gray-400 cursor-not-allowed select-none">
            Resend OTP ({cooldown >= 60 ? formatCountdown(cooldown) : `${cooldown}s`})
          </span>
        ) : (
          <button
            type="button"
            onClick={() => void handleResend()}
            className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors cursor-pointer"
          >
            Resend OTP
          </button>
        )}
      </div>
    </AuthLayout>
  );
}
