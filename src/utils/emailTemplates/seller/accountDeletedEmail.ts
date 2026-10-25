import { renderSellerEmail, sellerPanelUrl } from '../sellerEmailLayout';
import type { EmailContent } from '../sellerEmailLayout';

export function accountDeletedEmail(sellerName: string, recoveryDays: number): EmailContent {
  return renderSellerEmail('Your Loccalo Seller Account Has Been Deleted', {
    sellerName,
    paragraphs: [
      'Your Loccalo seller account has been deleted as requested.',
      `If your account is eligible for recovery, you can log in again within ${recoveryDays} days from the date of deletion to restore your account.`,
      'After the recovery period expires, your account may no longer be recoverable.',
    ],
    cta: { label: 'LOG IN TO RECOVER ACCOUNT', url: sellerPanelUrl('/login') },
    afterCta: ['If you did not request this account deletion, please contact Loccalo Support immediately.'],
    signOff: 'Team Loccalo Support',
  });
}
