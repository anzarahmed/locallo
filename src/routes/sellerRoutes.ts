import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import { addSeller } from '../controllers/sellerController';
import { validate } from '../middleware/validate';
import { createSellerSchema } from '../validation/sellerSchemas';

const router = Router();

router.post('/', requireAdmin, validate(createSellerSchema), addSeller);

export default router;
