import cron from 'node-cron';
import { Op } from 'sequelize';
import { Offer } from '../models/Offer';
import { User } from '../models/User';
import { SellerProfile } from '../models/SellerProfile';
import { OfferSellerNotification } from '../models/OfferSellerNotification';
import { createNotification } from '../services/customer/notificationService';
import { sendOfferNotificationEmail } from '../utils/mailer';

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 500;
const START_CUTOFF_MS = 2 * 60 * 60 * 1000;
const START_CUTOFF_ERROR = 'Offer starts within 2 hours or has already started';

let isRunning = false;

async function expireNearStartOffers(): Promise<void> {
  const cutoff = new Date(Date.now() + START_CUTOFF_MS);
  const expiringOffers = await Offer.findAll({
    where: { startDate: { [Op.lte]: cutoff } },
    attributes: ['id'],
  });
  if (expiringOffers.length === 0) return;

  const offerIds = expiringOffers.map((offer) => offer.id);

  await OfferSellerNotification.update(
    { emailStatus: 'failed', emailLastError: START_CUTOFF_ERROR },
    { where: { offerId: { [Op.in]: offerIds }, emailStatus: 'pending' } },
  );
  await OfferSellerNotification.update(
    { notificationStatus: 'failed', notificationLastError: START_CUTOFF_ERROR },
    { where: { offerId: { [Op.in]: offerIds }, notificationStatus: 'pending' } },
  );
}

async function sendEmailChannel(row: OfferSellerNotification): Promise<void> {
  const email = row.seller.sellerProfile?.email ?? row.seller.email;

  if (!email) {
    await OfferSellerNotification.update(
      { emailStatus: 'failed', emailLastError: 'Seller has no email on file' },
      { where: { id: row.id } },
    );
    return;
  }

  try {
    await sendOfferNotificationEmail(email, row.offer.title, row.offer.description);
    await OfferSellerNotification.update(
      { emailStatus: 'sent', emailSentAt: new Date(), emailLastError: null },
      { where: { id: row.id } },
    );
  } catch (err) {
    const attempts = row.emailAttempts + 1;
    await OfferSellerNotification.update(
      {
        emailAttempts: attempts,
        emailLastError: String((err as Error)?.message ?? err),
        emailStatus: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
      },
      { where: { id: row.id } },
    );
  }
}

async function sendNotificationChannel(row: OfferSellerNotification): Promise<void> {
  try {
    const message =
      row.offer.description ?? `A new offer "${row.offer.title}" is available — open it to see the details.`;
    await createNotification(row.sellerId, row.offer.title, message, 'offer', 'offer', String(row.offerId));
    await OfferSellerNotification.update(
      { notificationStatus: 'sent', notificationSentAt: new Date(), notificationLastError: null },
      { where: { id: row.id } },
    );
  } catch (err) {
    const attempts = row.notificationAttempts + 1;
    await OfferSellerNotification.update(
      {
        notificationAttempts: attempts,
        notificationLastError: String((err as Error)?.message ?? err),
        notificationStatus: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
      },
      { where: { id: row.id } },
    );
  }
}

async function processRow(row: OfferSellerNotification): Promise<void> {
  const tasks: Promise<void>[] = [];
  if (row.emailStatus === 'pending') tasks.push(sendEmailChannel(row));
  if (row.notificationStatus === 'pending') tasks.push(sendNotificationChannel(row));
  await Promise.allSettled(tasks);
}

async function processPendingOfferNotifications(): Promise<void> {
  if (isRunning) return;
  isRunning = true;

  try {
    await expireNearStartOffers();

    const rows = await OfferSellerNotification.findAll({
      where: {
        [Op.or]: [{ emailStatus: 'pending' }, { notificationStatus: 'pending' }],
      },
      include: [
        { model: Offer },
        { model: User, include: [{ model: SellerProfile, attributes: ['email'] }] },
      ],
      limit: BATCH_SIZE,
      order: [['createdAt', 'ASC']],
    });

    const results = await Promise.allSettled(rows.map(processRow));
    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('offerNotificationJob: failed to process a row', result.reason);
      }
    }
  } catch (err) {
    console.error('offerNotificationJob: cron tick failed', err);
  } finally {
    isRunning = false;
  }
}

export function startOfferNotificationCron(): void {
  cron.schedule('*/5 * * * *', () => {
    processPendingOfferNotifications().catch((err) => {
      console.error('offerNotificationJob: unhandled error in cron tick', err);
    });
  });
  console.log('Offer notification cron scheduled (every 5 minutes)');
}

export { processPendingOfferNotifications };
