import { Router } from 'express';
import { login } from '../../controllers/admin/adminController';
import { validate } from '../../middleware/validate';
import { adminLoginSchema } from '../../validation/admin/adminSchemas';

const router = Router();

router.post('/login', validate(adminLoginSchema), login);

export default router;
