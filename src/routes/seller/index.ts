import { Router } from 'express';
import { requireSeller } from '../../middleware/auth';
import { getDashboardStats } from '../../controllers/seller/dashboardController';
import { getProfile, updateSeller, updateAddress, getSettings, updateSettings, getCustomDayOverride, setCustomDayOverride, clearCustomDayOverride } from '../../controllers/seller/sellerController';
import { requestOtp, verifyOtp, logout } from '../../controllers/seller/sellerAuthController';
import {
  uploadImage, createProduct, getProducts,
  getProduct, updateProduct, toggleProduct, deleteProduct,
} from '../../controllers/seller/productController';
import { analyzeImage } from '../../controllers/seller/imageAnalysisController';
import { getCategories, getMyCategories } from '../../controllers/seller/categoryController';
import { getVariants, createVariant, createBatchVariants, updateVariant, deleteVariant, toggleVariant } from '../../controllers/seller/variantController';
import { markProductSold, markVariantSold, getSoldLogs } from '../../controllers/seller/soldController';
import { getOffers, getAcceptedOffers, getOffer, acceptOffer } from '../../controllers/seller/offerController';
import { getNotifications, markNotificationRead, deleteNotification } from '../../controllers/seller/notificationController';
import { validate } from '../../middleware/validate';
import upload from '../../middleware/upload';
import { updateSellerSchema, updateAddressSchema, updateNotificationSettingsSchema, setCustomDaySchema } from '../../validation/seller/sellerSchemas';
import { requestOtpSchema, verifyOtpSchema } from '../../validation/seller/sellerAuthSchemas';
import { createProductSchema, updateProductSchema } from '../../validation/seller/productSchemas';
import { createVariantSchema, createBatchVariantSchema, updateVariantSchema } from '../../validation/seller/variantSchemas';
import { markSoldSchema } from '../../validation/seller/soldSchemas';
import { acceptOfferSchema } from '../../validation/seller/offerSchemas';

const router = Router();

router.post('/auth/request-otp', validate(requestOtpSchema), requestOtp);
router.post('/auth/verify-otp',  validate(verifyOtpSchema),  verifyOtp);
router.post('/auth/logout',      requireSeller,               logout);

router.get('/dashboard/stats', requireSeller, getDashboardStats);

router.get('/categories', requireSeller, getCategories);
router.get('/my-categories', requireSeller, getMyCategories);

router.get('/profile', requireSeller, getProfile);
router.put('/profile', requireSeller, validate(updateSellerSchema),  updateSeller);
router.put('/address', requireSeller, validate(updateAddressSchema), updateAddress);

router.get('/settings', requireSeller, getSettings);
router.put('/settings', requireSeller, validate(updateNotificationSettingsSchema), updateSettings);

router.get('/custom-day',    requireSeller, getCustomDayOverride);
router.put('/custom-day',    requireSeller, validate(setCustomDaySchema), setCustomDayOverride);
router.delete('/custom-day', requireSeller, clearCustomDayOverride);

router.post('/products/images',          requireSeller, upload.single('image'), uploadImage);
router.post('/products/analyze-image',   requireSeller, upload.single('image'), analyzeImage);
router.post('/products',              requireSeller, validate(createProductSchema), createProduct);
router.get('/products',               requireSeller, getProducts);
router.get('/products/:id',           requireSeller, getProduct);
router.put('/products/:id',           requireSeller, validate(updateProductSchema), updateProduct);
router.patch('/products/:id/toggle',  requireSeller, toggleProduct);
router.delete('/products/:id',        requireSeller, deleteProduct);

router.get('/products/:productId/variants',                     requireSeller, getVariants);
router.post('/products/:productId/variants',                    requireSeller, validate(createVariantSchema), createVariant);
router.post('/products/:productId/variants/batch',              requireSeller, validate(createBatchVariantSchema), createBatchVariants);
router.put('/products/:productId/variants/:variantId',          requireSeller, validate(updateVariantSchema), updateVariant);
router.delete('/products/:productId/variants/:variantId',       requireSeller, deleteVariant);
router.patch('/products/:productId/variants/:variantId/toggle', requireSeller, toggleVariant);
router.post('/products/:id/variants/:variantId/sell',           requireSeller, validate(markSoldSchema), markVariantSold);

router.post('/products/:id/sell', requireSeller, validate(markSoldSchema), markProductSold);

router.get('/sold-logs', requireSeller, getSoldLogs);

router.get('/offers',            requireSeller, getOffers);
router.get('/offers/accepted',   requireSeller, getAcceptedOffers);
router.get('/offers/:id',        requireSeller, getOffer);
router.post('/offers/:id/accept', requireSeller, validate(acceptOfferSchema), acceptOffer);

router.get('/notifications',            requireSeller, getNotifications);
router.patch('/notifications/:id/read', requireSeller, markNotificationRead);
router.delete('/notifications/:id',     requireSeller, deleteNotification);

export default router;
