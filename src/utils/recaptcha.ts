const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

interface RecaptchaVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  'error-codes'?: string[];
}

export interface RecaptchaResult {
  success: boolean;
  score?: number;
  action?: string;
  errorCodes?: string[];
}

export async function verifyRecaptchaToken(token: string): Promise<RecaptchaResult> {
  const params = new URLSearchParams({
    secret: process.env.RECAPTCHA_SECRET_KEY as string,
    response: token,
  });

  const response = await fetch(RECAPTCHA_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const text = await response.text();
  let data: RecaptchaVerifyResponse;
  try {
    data = JSON.parse(text) as RecaptchaVerifyResponse;
  } catch {
    console.error('[recaptcha] non-JSON response:', { status: response.status, body: text });
    throw new Error(`reCAPTCHA: unexpected response (HTTP ${response.status})`);
  }

  return {
    success: data.success,
    score: data.score,
    action: data.action,
    errorCodes: data['error-codes'],
  };
}
