import { Router } from 'express';
import { requireSeller } from '../../middleware/auth';
import { updateSeller, updateAddress } from '../../controllers/seller/sellerController';
import { requestOtp, verifyOtp, logout } from '../../controllers/seller/sellerAuthController';
import {
  uploadImage, createProduct, getProducts,
  getProduct, updateProduct, toggleProduct, deleteProduct,
} from '../../controllers/seller/productController';
import { getCategories } from '../../controllers/seller/categoryController';
import { validate } from '../../middleware/validate';
import upload from '../../middleware/upload';
import { updateSellerSchema, updateAddressSchema } from '../../validation/seller/sellerSchemas';
import { requestOtpSchema, verifyOtpSchema } from '../../validation/seller/sellerAuthSchemas';
import { createProductSchema, updateProductSchema } from '../../validation/seller/productSchemas';

const router = Router();

router.post('/auth/request-otp', validate(requestOtpSchema), requestOtp);
router.post('/auth/verify-otp',  validate(verifyOtpSchema),  verifyOtp);
router.post('/auth/logout',      requireSeller,               logout);

router.get('/categories', requireSeller, getCategories);

router.put('/profile', requireSeller, validate(updateSellerSchema),  updateSeller);
router.put('/address', requireSeller, validate(updateAddressSchema), updateAddress);

router.post('/products/images',       requireSeller, upload.single('image'), uploadImage);
router.post('/products',              requireSeller, validate(createProductSchema), createProduct);
router.get('/products',               requireSeller, getProducts);
router.get('/products/:id',           requireSeller, getProduct);
router.put('/products/:id',           requireSeller, validate(updateProductSchema), updateProduct);
router.patch('/products/:id/toggle',  requireSeller, toggleProduct);
router.delete('/products/:id',        requireSeller, deleteProduct);

export default router;
