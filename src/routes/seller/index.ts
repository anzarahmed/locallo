import { Router } from 'express';
import { requireSeller } from '../../middleware/auth';
import { updateSeller, updateAddress } from '../../controllers/seller/sellerController';
import { requestOtp, verifyOtp, logout } from '../../controllers/seller/sellerAuthController';
import { validate } from '../../middleware/validate';
import { updateSellerSchema, updateAddressSchema } from '../../validation/seller/sellerSchemas';
import { requestOtpSchema, verifyOtpSchema } from '../../validation/seller/sellerAuthSchemas';

const router = Router();

router.post('/auth/request-otp', validate(requestOtpSchema), requestOtp);
router.post('/auth/verify-otp',  validate(verifyOtpSchema),  verifyOtp);
router.post('/auth/logout',      requireSeller,               logout);

router.put('/profile', requireSeller, validate(updateSellerSchema),  updateSeller);
router.put('/address', requireSeller, validate(updateAddressSchema), updateAddress);

export default router;
