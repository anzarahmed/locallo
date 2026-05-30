import { useEffect, useRef, useState, type JSX, type ClipboardEvent, type KeyboardEvent } from 'react';
import { X, Loader2, CheckCircle } from 'lucide-react';
import { requestMobileOtp, verifyMobileOtp } from '../../services/mobileVerificationService';
import { ApiError } from '../../lib/axios';

interface Props {
  isOpen: boolean;
  countryCode: string;
  mobile: string;
  onVerified: () => void;
  onClose: () => void;
}

const RESEND_COOLDOWN = 30;

export default function OtpVerificationModal({
  isOpen, countryCode, mobile, onVerified, onClose,
}: Props): JSX.Element | null {
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<number>(RESEND_COOLDOWN);
  const [success, setSuccess] = useState<boolean>(false);
  const [resendCount, setResendCount] = useState<number>(0);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([null, null, null, null]);

  useEffect(() => {
    if (!isOpen) return;
    setDigits(['', '', '', '']);
    setError(null);
    setSuccess(false);
    setCooldown(RESEND_COOLDOWN);
    setTimeout(() => inputRefs.current[0]?.focus(), 50);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setCooldown(RESEND_COOLDOWN);
    const timer = setInterval(() => {
      setCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, resendCount]);

  function handleDigitChange(index: number, value: string): void {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError(null);
    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>): void {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    const next = ['', '', '', ''];
    text.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    const nextEmpty = next.findIndex(d => !d);
    const focusIndex = nextEmpty === -1 ? 3 : nextEmpty;
    inputRefs.current[focusIndex]?.focus();
  }

  async function handleVerify(): Promise<void> {
    const otp = digits.join('');
    if (otp.length < 4) {
      setError('Enter the 4-digit code');
      return;
    }
    setIsVerifying(true);
    setError(null);
    try {
      await verifyMobileOtp(countryCode, mobile, otp);
      setSuccess(true);
      setTimeout(() => { onVerified(); onClose(); }, 800);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 410) {
          setError('OTP expired. Please request a new one.');
        } else if (err.status === 422) {
          setError('Incorrect OTP. Please try again.');
        } else {
          setError('Verification failed. Please try again.');
        }
      } else {
        setError('Verification failed. Please try again.');
      }
      setDigits(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend(): Promise<void> {
    setIsResending(true);
    setError(null);
    setDigits(['', '', '', '']);
    try {
      await requestMobileOtp(countryCode, mobile);
      setResendCount(c => c + 1);
      inputRefs.current[0]?.focus();
    } catch {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setIsResending(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Verify Mobile Number</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-700">Mobile number verified!</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-1">We sent a 4-digit code to</p>
            <p className="text-sm font-semibold text-gray-800 mb-6">
              {countryCode} {mobile}
            </p>

            <div className="flex justify-center gap-3 mb-2">
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleDigitChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  className={`w-12 h-12 text-center text-lg font-semibold border-2 rounded-xl focus:outline-none focus:ring-2 transition-colors ${
                    error
                      ? 'border-red-400 focus:ring-red-400 bg-red-50'
                      : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                  }`}
                />
              ))}
            </div>

            {error && (
              <p className="text-center text-xs text-red-600 mb-4" role="alert">{error}</p>
            )}

            <button
              type="button"
              onClick={handleVerify}
              disabled={isVerifying || digits.join('').length < 4}
              className="mt-4 w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
            >
              {isVerifying && <Loader2 className="w-4 h-4 animate-spin" />}
              {isVerifying ? 'Verifying…' : 'Verify'}
            </button>

            <div className="mt-4 text-center">
              {cooldown > 0 ? (
                <span className="text-xs text-gray-400">Resend code in {cooldown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
                >
                  {isResending ? 'Sending…' : 'Resend OTP'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
