import { forwardRef, type JSX } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

const RECAPTCHA_V2_SITE_KEY: string = import.meta.env.VITE_RECAPTCHA_V2_SITE_KEY ?? '';

interface RecaptchaV2Props {
  onChange: (token: string | null) => void;
}

const RecaptchaV2 = forwardRef<ReCAPTCHA, RecaptchaV2Props>(function RecaptchaV2(
  { onChange },
  ref,
): JSX.Element {
  return (
    <div className="flex justify-center">
      <ReCAPTCHA
        ref={ref}
        sitekey={RECAPTCHA_V2_SITE_KEY}
        onChange={onChange}
        onExpired={() => onChange(null)}
        onErrored={() => onChange(null)}
      />
    </div>
  );
});

export default RecaptchaV2;
