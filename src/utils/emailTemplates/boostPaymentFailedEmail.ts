interface BoostPaymentFailedEmail {
  subject: string;
  html: string;
}

export function boostPaymentFailedEmail(
  businessName: string,
  productName: string,
  amount: number,
): BoostPaymentFailedEmail {
  const subject = `Payment failed — your boost for "${productName}" wasn't activated`;

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#DC2626">Payment failed</h2>
      <p>Hi ${businessName},</p>
      <p>Your payment of <strong>₹${amount}</strong> for boosting <strong>${productName}</strong> could not be completed, so the boost was not activated.</p>
      <p>You can try boosting the product again from the Seller Panel.</p>
      <p style="color:#6b7280;font-size:13px">This is an automated notification from Localo Seller Panel.</p>
    </div>
  `;

  return { subject, html };
}
