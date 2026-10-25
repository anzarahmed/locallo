export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface EmailDetail {
  label: string;
  value: string;
}

export interface SellerEmailParts {
  sellerName: string;
  paragraphs: string[];
  bullets?: string[];
  details?: EmailDetail[];
  highlight?: string;
  beforeCta?: string[];
  cta: { label: string; url: string };
  afterCta?: string[];
  signOff?: string;
}

const BRAND = '#14817C';
const BRAND_LIGHT = '#26B8B2';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sellerPanelUrl(path: string): string {
  const base = (process.env.SELLER_PANEL_URL ?? 'http://localhost:5173/seller').replace(/\/+$/, '');
  return `${base}${path}`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151">${escapeHtml(text)}</p>`;
}

function renderBullets(bullets: string[]): string {
  const items = bullets
    .map((b) => `<li style="margin:0 0 6px;font-size:15px;line-height:1.5;color:#374151">${escapeHtml(b)}</li>`)
    .join('');
  return `<ul style="margin:0 0 16px;padding-left:20px">${items}</ul>`;
}

function renderDetails(details: EmailDetail[]): string {
  const rows = details
    .map((d) => `
      <tr>
        <td style="padding:8px 12px;font-size:14px;color:#6b7280;white-space:nowrap">${escapeHtml(d.label)}</td>
        <td style="padding:8px 12px;font-size:14px;color:#111827;font-weight:600">${escapeHtml(d.value)}</td>
      </tr>`)
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;background:#f0fdfa;border:1px solid #ccfbf1;border-radius:8px">${rows}</table>`;
}

function renderHighlight(text: string): string {
  return `<p style="margin:0 0 16px;padding:12px 16px;background:#f0fdfa;border-left:4px solid ${BRAND};font-size:15px;color:#111827;font-weight:600">${escapeHtml(text)}</p>`;
}

function renderButton(label: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px">
      <tr>
        <td style="border-radius:8px;background:${BRAND}">
          <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px">${escapeHtml(label)} &rarr;</a>
        </td>
      </tr>
    </table>`;
}

function renderText(parts: SellerEmailParts): string {
  const signOff = parts.signOff ?? 'Team Loccalo';
  return [
    `Dear ${parts.sellerName},`,
    ...parts.paragraphs,
    ...(parts.bullets ?? []).map((b) => `• ${b}`),
    ...(parts.details ?? []).map((d) => `${d.label}: ${d.value}`),
    ...(parts.highlight ? [parts.highlight] : []),
    ...(parts.beforeCta ?? []),
    `${parts.cta.label}: ${parts.cta.url}`,
    ...(parts.afterCta ?? []),
    `Best regards,\n${signOff}`,
  ].join('\n\n');
}

export function renderSellerEmail(subject: string, parts: SellerEmailParts): EmailContent {
  const signOff = parts.signOff ?? 'Team Loccalo';
  const body = [
    paragraph(`Dear ${parts.sellerName},`),
    ...parts.paragraphs.map(paragraph),
    parts.bullets ? renderBullets(parts.bullets) : '',
    parts.details ? renderDetails(parts.details) : '',
    parts.highlight ? renderHighlight(parts.highlight) : '',
    ...(parts.beforeCta ?? []).map(paragraph),
    renderButton(parts.cta.label, parts.cta.url),
    ...(parts.afterCta ?? []).map(paragraph),
    `<p style="margin:0;font-size:15px;line-height:1.6;color:#374151">Best regards,<br>${escapeHtml(signOff)}</p>`,
  ].join('');

  // Table layout + inline styles: most email clients ignore <style> blocks and flexbox.
  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f3f4f6;padding:24px 12px">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
            <tr>
              <td style="background:${BRAND};background-image:linear-gradient(135deg,${BRAND_LIGHT},${BRAND});padding:24px 32px">
                <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:0.5px">Loccalo</span>
                <span style="display:block;font-size:12px;color:#ccfbf1;margin-top:2px">Seller</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px">${body}</td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#f9fafb;font-size:12px;color:#9ca3af;text-align:center">
                This is an automated message from Loccalo. You can manage email preferences in your seller Settings.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text: renderText(parts) };
}
