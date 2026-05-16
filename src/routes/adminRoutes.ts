import { Router } from 'express';
import { login } from '../controllers/adminController';
import { validate } from '../middleware/validate';
import { adminLoginSchema } from '../validation/adminSchemas';

const router = Router();

router.post('/login', validate(adminLoginSchema), login);

export default router;
