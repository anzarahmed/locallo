import cron from 'node-cron';
import { Op } from 'sequelize';
import { User } from '../models/User';
import { permanentlyDeleteSellerAccount, SELLER_DELETION_HOLD_DAYS } from '../services/seller/sellerService';
import { permanentlyDeleteCustomerAccount } from '../services/customer/customerProfileService';

const CUSTOMER_HOLD_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 500;

let isRunning = false;

async function processExpiredDeletions(): Promise<void> {
  if (isRunning) return;
  isRunning = true;

  try {
    const now = Date.now();
    const users = await User.findAll({
      where: {
        [Op.or]: [
          { role: 'SELLER', deletionRequestedAt: { [Op.lte]: new Date(now - SELLER_DELETION_HOLD_DAYS * DAY_MS) } },
          { role: { [Op.ne]: 'SELLER' }, deletionRequestedAt: { [Op.lte]: new Date(now - CUSTOMER_HOLD_DAYS * DAY_MS) } },
        ],
      },
      attributes: ['id', 'role'],
      limit: BATCH_SIZE,
    });

    const results = await Promise.allSettled(
      users.map((user) =>
        user.role === 'SELLER'
          ? permanentlyDeleteSellerAccount(user.id)
          : permanentlyDeleteCustomerAccount(user.id),
      ),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('accountDeletionJob: failed to permanently delete an account', result.reason);
      }
    }
  } catch (err) {
    console.error('accountDeletionJob: cron tick failed', err);
  } finally {
    isRunning = false;
  }
}

export function startAccountDeletionCron(): void {
  cron.schedule('0 3 * * *', () => {
    processExpiredDeletions().catch((err) => {
      console.error('accountDeletionJob: unhandled error in cron tick', err);
    });
  });
  console.log('Account deletion cron scheduled (daily at 03:00)');
}

export { processExpiredDeletions };
