const MSG91_OTP_URL = 'https://control.msg91.com/api/v5/otp';

interface Msg91Response {
  type: 'success' | 'error';
  message: string;
  request_id?: string;
}

export async function sendOtp(countryCode: string, phoneNumber: string, otp: string): Promise<void> {
  const mobile = `${countryCode.replace('+', '')}${phoneNumber}`;

  const response = await fetch(MSG91_OTP_URL, {
    method: 'POST',
    headers: {
      authkey: process.env.MSG91_AUTH_KEY as string,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      template_id: process.env.MSG91_TEMPLATE_ID,
      mobile,
      otp,
    }),
  });
console.log("\n\n\n\nresponse>>", response)
  const data = await response.json() as Msg91Response;

  console.log('[MSG91]', { mobile, status: response.status, response: data });

  if (!response.ok || data.type === 'error') {
    throw new Error(`MSG91: ${data.message}`);
  }
}
