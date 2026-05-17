import { Router } from 'express';
import { login } from '../../controllers/admin/adminController';
import { addSeller, getSellers, getSeller, adminEditSeller } from '../../controllers/seller/sellerController';
import { validate } from '../../middleware/validate';
import { requireAdmin } from '../../middleware/auth';
import { adminLoginSchema } from '../../validation/admin/adminSchemas';
import { createSellerSchema, adminUpdateSellerSchema } from '../../validation/seller/sellerSchemas';

const router = Router();

router.post('/login', validate(adminLoginSchema), login);

router.post('/sellers',     requireAdmin, validate(createSellerSchema),      addSeller);
router.get('/sellers',      requireAdmin,                                     getSellers);
router.get('/sellers/:id',  requireAdmin,                                     getSeller);
router.put('/sellers/:id',  requireAdmin, validate(adminUpdateSellerSchema),  adminEditSeller);

export default router;
