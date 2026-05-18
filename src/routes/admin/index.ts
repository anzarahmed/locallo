import { Router } from 'express';
import { login } from '../../controllers/admin/adminController';
import { addSeller, getSellers, getSeller, adminEditSeller, patchSellerStatus } from '../../controllers/seller/sellerController';
import { getCategories, addCategory, editCategory, removeCategory } from '../../controllers/admin/categoryController';
import { validate } from '../../middleware/validate';
import { requireAdmin } from '../../middleware/auth';
import { adminLoginSchema } from '../../validation/admin/adminSchemas';
import { createSellerSchema, adminUpdateSellerSchema } from '../../validation/seller/sellerSchemas';
import { createCategorySchema, updateCategorySchema } from '../../validation/admin/categorySchemas';

const router = Router();

router.post('/login', validate(adminLoginSchema), login);

router.post('/sellers',             requireAdmin, validate(createSellerSchema),      addSeller);
router.get('/sellers',              requireAdmin,                                     getSellers);
router.get('/sellers/:id',          requireAdmin,                                     getSeller);
router.put('/sellers/:id',          requireAdmin, validate(adminUpdateSellerSchema),  adminEditSeller);
router.patch('/sellers/:id/status', requireAdmin,                                     patchSellerStatus);

router.get('/categories',           getCategories);
router.post('/categories',          requireAdmin, validate(createCategorySchema),   addCategory);
router.put('/categories/:id',       requireAdmin, validate(updateCategorySchema),   editCategory);
router.delete('/categories/:id',    requireAdmin,                                   removeCategory);

export default router;
