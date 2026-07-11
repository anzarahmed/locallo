import { Router } from 'express';
import { requestOtp, verifyOtp } from '../../controllers/customer/customerAuthController';
import { getProducts, getProduct, getTrendingProducts } from '../../controllers/customer/productController';
import { getDashboard } from '../../controllers/customer/dashboardController';
import { validate } from '../../middleware/validate';
import { requestOtpSchema, verifyOtpSchema } from '../../validation/customer/customerAuthSchemas';
import { searchProductsSchema } from '../../validation/customer/productSchemas';

const router = Router();

router.post('/auth/request-otp', validate(requestOtpSchema), requestOtp);
router.post('/auth/verify-otp',  validate(verifyOtpSchema),  verifyOtp);

router.get('/dashboard',          getDashboard);
router.get('/products/trending', getTrendingProducts);
router.post('/products',         validate(searchProductsSchema), getProducts);
router.get('/products/:id',      getProduct);

export default router;
