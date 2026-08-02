import { Router } from 'express';
import { login, forgotPassword, resetPassword } from '../../controllers/admin/adminController';
import { addSeller, getSellers, getSeller, adminEditSeller, patchSellerStatus, patchSellerBrands, uploadKycDocument, setKycVerification } from '../../controllers/seller/sellerController';
import { getCategories, addCategory, editCategory, removeCategory, uploadCategoryIcon } from '../../controllers/admin/categoryController';
import { getBrands, addBrand, editBrand, removeBrand, uploadBrandLogo } from '../../controllers/admin/brandController';
import { getBanners, addBanner, editBanner, removeBanner, uploadBannerImage } from '../../controllers/admin/bannerController';
import { getFaqs, addFaq, editFaq, removeFaq } from '../../controllers/admin/faqController';
import {
  getProducts as getAdminProducts,
  getProduct  as getAdminProduct,
  toggleProduct, deleteProduct,
} from '../../controllers/admin/productController';
import { requestOtp as requestMobileOtp, verifyOtp as verifyMobileOtp } from '../../controllers/admin/mobileVerificationController';
import { getCustomers, getCustomer, patchCustomerStatus } from '../../controllers/admin/customerController';
import {
  getSubAdmins, addSubAdmin, editSubAdmin, removeSubAdmin, patchSubAdminStatus,
} from '../../controllers/admin/subAdminController';
import {
  fetchRolePermissions, saveRolePermissions, fetchMyPermissions,
} from '../../controllers/admin/rolePermissionController';
import { validate } from '../../middleware/validate';
import upload, { uploadIcon } from '../../middleware/upload';
import { requireAdmin, requireSuperAdmin, requirePermission } from '../../middleware/auth';
import { adminLoginSchema, forgotPasswordSchema, resetPasswordSchema } from '../../validation/admin/adminSchemas';
import { createSellerSchema, adminUpdateSellerSchema, updateSellerBrandsSchema } from '../../validation/seller/sellerSchemas';
import { createCategorySchema, updateCategorySchema } from '../../validation/admin/categorySchemas';
import { createBrandSchema, updateBrandSchema } from '../../validation/admin/brandSchemas';
import { createBannerSchema, updateBannerSchema } from '../../validation/admin/bannerSchemas';
import { createFaqSchema, updateFaqSchema } from '../../validation/admin/faqSchemas';
import { requestMobileOtpSchema, verifyMobileOtpSchema } from '../../validation/admin/mobileVerificationSchemas';
import { createSubAdminSchema, updateSubAdminSchema } from '../../validation/admin/subAdminSchemas';
import { updateRolePermissionsSchema } from '../../validation/admin/rolePermissionSchemas';

const router = Router();

// Public auth
router.post('/login',           validate(adminLoginSchema),       login);
router.post('/forgot-password', validate(forgotPasswordSchema),   forgotPassword);
router.post('/reset-password',  validate(resetPasswordSchema),    resetPassword);

// Mobile OTP (admin-initiated, any admin role)
router.post('/mobile/request-otp', requireAdmin, validate(requestMobileOtpSchema), requestMobileOtp);
router.post('/mobile/verify-otp',  requireAdmin, validate(verifyMobileOtpSchema),  verifyMobileOtp);

// My permissions (any authenticated admin)
router.get('/me/permissions', requireAdmin, fetchMyPermissions);

// Sub-admin management (super_admin only)
router.get   ('/sub-admins',          requireAdmin, requireSuperAdmin, getSubAdmins);
router.post  ('/sub-admins',          requireAdmin, requireSuperAdmin, validate(createSubAdminSchema), addSubAdmin);
router.put   ('/sub-admins/:id',      requireAdmin, requireSuperAdmin, validate(updateSubAdminSchema), editSubAdmin);
router.delete('/sub-admins/:id',      requireAdmin, requireSuperAdmin, removeSubAdmin);
router.patch ('/sub-admins/:id/status', requireAdmin, requireSuperAdmin, patchSubAdminStatus);

// Role permissions (super_admin only)
router.get('/roles/:role/permissions', requireAdmin, requireSuperAdmin, fetchRolePermissions);
router.put('/roles/:role/permissions', requireAdmin, requireSuperAdmin, validate(updateRolePermissionsSchema), saveRolePermissions);

// Sellers
router.post  ('/sellers',             requireAdmin, requirePermission('sellers', 'add'),    validate(createSellerSchema),     addSeller);
router.get   ('/sellers',             requireAdmin, requirePermission('sellers', 'list'),   getSellers);
router.get   ('/sellers/:id',         requireAdmin, requirePermission('sellers', 'view'),   getSeller);
router.put   ('/sellers/:id',         requireAdmin, requirePermission('sellers', 'edit'),   validate(adminUpdateSellerSchema), adminEditSeller);
router.patch ('/sellers/:id/status',  requireAdmin, requirePermission('sellers', 'edit'),   patchSellerStatus);
router.post  ('/sellers/:id/kyc/documents', requireAdmin, requirePermission('sellers', 'edit'), upload.single('document'), uploadKycDocument);
router.patch ('/sellers/:id/kyc/verify',    requireAdmin, requirePermission('sellers', 'edit'), setKycVerification);
router.patch ('/sellers/:id/brands',        requireAdmin, requireSuperAdmin, validate(updateSellerBrandsSchema), patchSellerBrands);

// Customers
router.get   ('/customers',           requireAdmin, requirePermission('customers', 'list'),   getCustomers);
router.get   ('/customers/:id',       requireAdmin, requirePermission('customers', 'view'),   getCustomer);
router.patch ('/customers/:id/status',requireAdmin, requirePermission('customers', 'edit'),   patchCustomerStatus);

// Categories (GET is public — used for dropdowns in other UIs)
router.get   ('/categories',          getCategories);
router.post  ('/categories/icon',     requireAdmin, uploadIcon.single('icon'), uploadCategoryIcon);
router.post  ('/categories',          requireAdmin, requirePermission('categories', 'add'),    validate(createCategorySchema), addCategory);
router.put   ('/categories/:id',      requireAdmin, requirePermission('categories', 'edit'),   validate(updateCategorySchema), editCategory);
router.delete('/categories/:id',      requireAdmin, requirePermission('categories', 'delete'), removeCategory);

// Brands
router.get   ('/brands',              requireAdmin, requirePermission('brands', 'list'),   getBrands);
router.post  ('/brands/logo',         requireAdmin, uploadIcon.single('logo'), uploadBrandLogo);
router.post  ('/brands',              requireAdmin, requirePermission('brands', 'add'),    validate(createBrandSchema), addBrand);
router.put   ('/brands/:id',          requireAdmin, requirePermission('brands', 'edit'),   validate(updateBrandSchema), editBrand);
router.delete('/brands/:id',          requireAdmin, requirePermission('brands', 'delete'), removeBrand);

// Banners
router.get   ('/banners',             requireAdmin, requirePermission('banners', 'list'),   getBanners);
router.post  ('/banners/image',       requireAdmin, upload.single('image'), uploadBannerImage);
router.post  ('/banners',             requireAdmin, requirePermission('banners', 'add'),    validate(createBannerSchema), addBanner);
router.put   ('/banners/:id',         requireAdmin, requirePermission('banners', 'edit'),   validate(updateBannerSchema), editBanner);
router.delete('/banners/:id',         requireAdmin, requirePermission('banners', 'delete'), removeBanner);

// FAQs
router.get   ('/faqs',                requireAdmin, requirePermission('faqs', 'list'),   getFaqs);
router.post  ('/faqs',                requireAdmin, requirePermission('faqs', 'add'),    validate(createFaqSchema), addFaq);
router.put   ('/faqs/:id',            requireAdmin, requirePermission('faqs', 'edit'),   validate(updateFaqSchema), editFaq);
router.delete('/faqs/:id',            requireAdmin, requirePermission('faqs', 'delete'), removeFaq);

// Products
router.get   ('/products',              requireAdmin, requirePermission('products', 'list'),   getAdminProducts);
router.get   ('/products/:id',          requireAdmin, requirePermission('products', 'view'),   getAdminProduct);
router.patch ('/products/:id/toggle',   requireAdmin, requirePermission('products', 'edit'),   toggleProduct);
router.delete('/products/:id',          requireAdmin, requirePermission('products', 'delete'), deleteProduct);

export default router;
