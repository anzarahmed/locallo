import { Router } from 'express';
import { handleRazorpayWebhook } from '../../controllers/webhooks/razorpayWebhookController';

const router = Router();

router.post('/razorpay', handleRazorpayWebhook);

export default router;
