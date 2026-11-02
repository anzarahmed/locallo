import { Op, literal } from 'sequelize';
import { Admin } from '../../models/Admin';
import { User } from '../../models/User';
import { SellerProfile } from '../../models/SellerProfile';
import { sendAdminEmail } from '../../utils/mailer';
import { kycDocumentsSubmittedEmail } from '../../utils/emailTemplates/admin/kycDocumentsSubmittedEmail';

async function getKycReviewers(): Promise<Admin[]> {
  return Admin.findAll({
    attributes: ['email', 'fullName'],
    where: {
      isActive: true,
      [Op.or]: [
        { role: 'super_admin' },
        { role: { [Op.in]: literal(`(SELECT role FROM role_permissions WHERE module = 'sellers' AND action = 'edit')`) } },
      ],
    },
  });
}

export async function notifyAdminsKycSubmitted(sellerId: string): Promise<void> {
  const [user, profile, reviewers] = await Promise.all([
    User.findByPk(sellerId),
    SellerProfile.findOne({ where: { userId: sellerId } }),
    getKycReviewers(),
  ]);
  if (!user || !profile || reviewers.length === 0) return;

  const seller = {
    id: sellerId,
    businessName: profile.businessName,
    ownerName: user.fullName,
    mobile: `${user.countryCode ?? ''} ${user.mobile}`.trim(),
  };

  const results = await Promise.allSettled(
    reviewers.map((admin) => sendAdminEmail(admin.email, kycDocumentsSubmittedEmail(admin.fullName ?? 'Admin', seller))),
  );
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`notifyAdminsKycSubmitted: failed to email ${reviewers[i].email}`, result.reason);
    }
  });
}
