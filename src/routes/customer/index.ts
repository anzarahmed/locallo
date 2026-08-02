import { Router } from 'express';
import { requestOtp, verifyOtp } from '../../controllers/customer/customerAuthController';
import { getProfile, updateProfile, uploadProfileImage } from '../../controllers/customer/customerProfileController';
import { getProducts, getProduct, getTrendingProducts } from '../../controllers/customer/productController';
import { toggleWishlist, getWishlist } from '../../controllers/customer/wishlistController';
import { getDashboard } from '../../controllers/customer/dashboardController';
import { getNotifications, markNotificationRead, deleteNotification } from '../../controllers/customer/notificationController';
import { requireCustomer, optionalCustomer } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import upload from '../../middleware/upload';
import { requestOtpSchema, verifyOtpSchema } from '../../validation/customer/customerAuthSchemas';
import { updateCustomerProfileSchema } from '../../validation/customer/customerProfileSchemas';
import { searchProductsSchema } from '../../validation/customer/productSchemas';

const router = Router();

router.post('/auth/request-otp', validate(requestOtpSchema), requestOtp);
router.post('/auth/verify-otp',  validate(verifyOtpSchema),  verifyOtp);

router.get('/profile',       requireCustomer, getProfile);
router.put('/profile',       requireCustomer, validate(updateCustomerProfileSchema), updateProfile);
router.post('/profile/image', requireCustomer, upload.single('image'), uploadProfileImage);

router.get('/dashboard',          getDashboard);
router.get('/products/trending', optionalCustomer, getTrendingProducts);
router.post('/products',         optionalCustomer, validate(searchProductsSchema), getProducts);
router.get('/products/:id',      optionalCustomer, getProduct);

router.get('/wishlist',                 requireCustomer, getWishlist);
router.post('/wishlist/:productId',     requireCustomer, toggleWishlist);

router.get('/notifications',           requireCustomer, getNotifications);
router.patch('/notifications/:id/read', requireCustomer, markNotificationRead);
router.delete('/notifications/:id',     requireCustomer, deleteNotification);

export default router;
