import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import { addSeller, getSellers } from '../controllers/sellerController';
import { validate } from '../middleware/validate';
import { createSellerSchema } from '../validation/sellerSchemas';

const router = Router();

router.post('/', requireAdmin, validate(createSellerSchema), addSeller);
router.get('/', requireAdmin, getSellers);

export default router;
