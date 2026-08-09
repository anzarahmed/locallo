interface OfferNotificationEmail {
  subject: string;
  html: string;
}

export function offerNotificationEmail(offerTitle: string, offerDescription: string | null): OfferNotificationEmail {
  const subject = `New offer available: ${offerTitle}`;
  const description = offerDescription ?? 'Check out the details and accept it for your products.';

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#14817C">New offer: ${offerTitle}</h2>
      <p>${description}</p>
      <p>Open the Localo Seller app to view the full offer details and select which of your products it should apply to.</p>
      <p style="color:#6b7280;font-size:13px">This is an automated notification from Localo Seller Panel.</p>
    </div>
  `;

  return { subject, html };
}
