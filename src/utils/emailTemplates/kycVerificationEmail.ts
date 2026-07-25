interface KycVerificationEmail {
  subject: string;
  html: string;
}

export function kycVerificationEmail(businessName: string, verified: boolean): KycVerificationEmail {
  const subject = verified ? 'Your KYC verification is complete' : 'Your KYC verification has been revoked';
  const heading = verified ? "You're verified!" : 'Verification revoked';
  const message = verified
    ? `Congratulations, <strong>${businessName}</strong>! Your KYC documents have been reviewed and your seller account is now verified on Localo.`
    : `Hi <strong>${businessName}</strong>, your seller verification on Localo has been revoked. Please contact support or re-submit your KYC documents.`;

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#14817C">${heading}</h2>
      <p>${message}</p>
      <p style="color:#6b7280;font-size:13px">This is an automated notification from Localo Seller Panel.</p>
    </div>
  `;

  return { subject, html };
}
