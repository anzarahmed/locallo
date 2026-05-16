import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth';
import { addSeller, getSellers } from '../../controllers/seller/sellerController';
import { requestOtp, verifyOtp } from '../../controllers/seller/sellerAuthController';
import { validate } from '../../middleware/validate';
import { createSellerSchema } from '../../validation/seller/sellerSchemas';
import { requestOtpSchema, verifyOtpSchema } from '../../validation/seller/sellerAuthSchemas';

const router = Router();

router.post('/auth/request-otp', validate(requestOtpSchema), requestOtp);
router.post('/auth/verify-otp', validate(verifyOtpSchema), verifyOtp);

router.post('/', requireAdmin, validate(createSellerSchema), addSeller);
router.get('/', requireAdmin, getSellers);

export default router;
