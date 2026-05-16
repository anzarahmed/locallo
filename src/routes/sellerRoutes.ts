import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import { addSeller } from '../controllers/sellerController';

const router = Router();

router.post('/', requireAdmin, addSeller);

export default router;
