import { Router } from 'express';
import { login, forgotPassword, resetPassword } from '../../controllers/admin/adminController';
import { addSeller, getSellers, getSeller, adminEditSeller, patchSellerStatus } from '../../controllers/seller/sellerController';
import { getCategories, addCategory, editCategory, removeCategory } from '../../controllers/admin/categoryController';
import {
  getProducts as getAdminProducts,
  getProduct  as getAdminProduct,
  toggleProduct, deleteProduct,
} from '../../controllers/admin/productController';
import { requestOtp as requestMobileOtp, verifyOtp as verifyMobileOtp } from '../../controllers/admin/mobileVerificationController';
import { validate } from '../../middleware/validate';
import { requireAdmin } from '../../middleware/auth';
import { adminLoginSchema, forgotPasswordSchema, resetPasswordSchema } from '../../validation/admin/adminSchemas';
import { createSellerSchema, adminUpdateSellerSchema } from '../../validation/seller/sellerSchemas';
import { createCategorySchema, updateCategorySchema } from '../../validation/admin/categorySchemas';
import { requestMobileOtpSchema, verifyMobileOtpSchema } from '../../validation/admin/mobileVerificationSchemas';

const router = Router();

router.post('/login',          validate(adminLoginSchema),        login);
router.post('/forgot-password', validate(forgotPasswordSchema),   forgotPassword);
router.post('/reset-password',  validate(resetPasswordSchema),    resetPassword);

router.post('/mobile/request-otp', requireAdmin, validate(requestMobileOtpSchema), requestMobileOtp);
router.post('/mobile/verify-otp',  requireAdmin, validate(verifyMobileOtpSchema),  verifyMobileOtp);

router.post('/sellers',             requireAdmin, validate(createSellerSchema),      addSeller);
router.get('/sellers',              requireAdmin,                                     getSellers);
router.get('/sellers/:id',          requireAdmin,                                     getSeller);
router.put('/sellers/:id',          requireAdmin, validate(adminUpdateSellerSchema),  adminEditSeller);
router.patch('/sellers/:id/status', requireAdmin,                                     patchSellerStatus);

router.get('/categories',           getCategories);
router.post('/categories',          requireAdmin, validate(createCategorySchema),   addCategory);
router.put('/categories/:id',       requireAdmin, validate(updateCategorySchema),   editCategory);
router.delete('/categories/:id',    requireAdmin,                                   removeCategory);

router.get('/products',             requireAdmin, getAdminProducts);
router.get('/products/:id',         requireAdmin, getAdminProduct);
router.patch('/products/:id/toggle',requireAdmin, toggleProduct);
router.delete('/products/:id',      requireAdmin, deleteProduct);

export default router;
