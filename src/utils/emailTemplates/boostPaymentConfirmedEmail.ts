interface BoostPaymentConfirmedEmail {
  subject: string;
  html: string;
}

export function boostPaymentConfirmedEmail(
  businessName: string,
  productName: string,
  amount: number,
): BoostPaymentConfirmedEmail {
  const subject = `Payment received — your boost for "${productName}" is live`;

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#14817C">Payment received</h2>
      <p>Hi ${businessName},</p>
      <p>We've received your payment of <strong>₹${amount}</strong> and your boost for <strong>${productName}</strong> is now active.</p>
      <p style="color:#6b7280;font-size:13px">This is an automated notification from Localo Seller Panel.</p>
    </div>
  `;

  return { subject, html };
}
