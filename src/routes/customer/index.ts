import { Router } from 'express';
import { requestOtp, verifyOtp } from '../../controllers/customer/customerAuthController';
import { validate } from '../../middleware/validate';
import { requestOtpSchema, verifyOtpSchema } from '../../validation/customer/customerAuthSchemas';

const router = Router();

router.post('/auth/request-otp', validate(requestOtpSchema), requestOtp);
router.post('/auth/verify-otp', validate(verifyOtpSchema), verifyOtp);

export default router;
