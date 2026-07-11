import { Router } from 'express';
import { requestOtp, verifyOtp } from '../../controllers/customer/customerAuthController';
import { getProducts, getProduct, getTrendingProducts } from '../../controllers/customer/productController';
import { toggleWishlist, getWishlist } from '../../controllers/customer/wishlistController';
import { getDashboard } from '../../controllers/customer/dashboardController';
import { requireCustomer, optionalCustomer } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { requestOtpSchema, verifyOtpSchema } from '../../validation/customer/customerAuthSchemas';
import { searchProductsSchema } from '../../validation/customer/productSchemas';

const router = Router();

router.post('/auth/request-otp', validate(requestOtpSchema), requestOtp);
router.post('/auth/verify-otp',  validate(verifyOtpSchema),  verifyOtp);

router.get('/dashboard',          getDashboard);
router.get('/products/trending', optionalCustomer, getTrendingProducts);
router.post('/products',         optionalCustomer, validate(searchProductsSchema), getProducts);
router.get('/products/:id',      optionalCustomer, getProduct);

router.get('/wishlist',                 requireCustomer, getWishlist);
router.post('/wishlist/:productId',     requireCustomer, toggleWishlist);

export default router;
