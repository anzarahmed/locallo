import { Faq } from '../../models/Faq';

export async function listPublicFaqs(): Promise<Faq[]> {
  return Faq.findAll({
    where: { isActive: true },
    order: [['createdAt', 'ASC']],
  });
}
