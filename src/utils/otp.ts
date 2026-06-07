export function generateOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function makeOtpExpiresAt(): Date {
  const ttl = parseInt(process.env.OTP_TTL_SECONDS ?? '300', 10);
  return new Date(Date.now() + ttl * 1000);
}
