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

async function callSiteVerify(secret: string, token: string, context: string): Promise<RecaptchaVerifyResponse> {
  const params = new URLSearchParams({ secret, response: token });

  const response = await fetch(RECAPTCHA_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const text = await response.text();
  try {
    return JSON.parse(text) as RecaptchaVerifyResponse;
  } catch {
    console.error(`[recaptcha] ${context} non-JSON response:`, { status: response.status, body: text });
    throw new Error(`reCAPTCHA: unexpected response (HTTP ${response.status})`);
  }
}

export async function verifyRecaptchaToken(token: string): Promise<RecaptchaResult> {
  const data = await callSiteVerify(process.env.RECAPTCHA_SECRET_KEY as string, token, 'v3');
  return {
    success: data.success,
    score: data.score,
    action: data.action,
    errorCodes: data['error-codes'],
  };
}

// v2 checkbox fallback, used when v3's invisible score-based check fails or is unavailable
// (e.g. blocked by a browser extension). Its siteverify response carries no score/action.
export async function verifyRecaptchaV2Token(token: string): Promise<RecaptchaResult> {
  const data = await callSiteVerify(process.env.RECAPTCHA_V2_SECRET_KEY as string, token, 'v2');
  return {
    success: data.success,
    errorCodes: data['error-codes'],
  };
}
