import { Router } from 'express';
import { requireAdmin, requireSeller } from '../../middleware/auth';
import { addSeller, getSellers, updateSeller, updateAddress } from '../../controllers/seller/sellerController';
import { requestOtp, verifyOtp, logout } from '../../controllers/seller/sellerAuthController';
import { validate } from '../../middleware/validate';
import { createSellerSchema, updateSellerSchema, updateAddressSchema } from '../../validation/seller/sellerSchemas';
import { requestOtpSchema, verifyOtpSchema } from '../../validation/seller/sellerAuthSchemas';

const router = Router();

router.post('/auth/request-otp', validate(requestOtpSchema), requestOtp);
router.post('/auth/verify-otp', validate(verifyOtpSchema), verifyOtp);
router.post('/auth/logout', requireSeller, logout);

router.post('/', requireAdmin, validate(createSellerSchema), addSeller);
router.get('/', requireAdmin, getSellers);
router.put('/profile', requireSeller, validate(updateSellerSchema), updateSeller);
router.put('/address', requireSeller, validate(updateAddressSchema), updateAddress);

export default router;
