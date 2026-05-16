import { Router } from 'express';
import { login } from '../controllers/adminController';

const router = Router();

router.post('/login', login);

export default router;
