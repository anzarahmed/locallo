import type { Request, Response } from 'express';
import * as Yup from 'yup';
import { adminLoginSchema } from '../validation/adminSchemas';
import { loginAdmin } from '../services/adminService';

export async function login(req: Request, res: Response): Promise<void> {
  const validation = await adminLoginSchema
    .validate(req.body, { abortEarly: false, stripUnknown: true })
    .catch((err: unknown) => {
      if (err instanceof Yup.ValidationError) return err;
      throw err;
    });

  if (validation instanceof Yup.ValidationError) {
    res.status(422).json({ message: 'Validation failed', errors: validation.errors });
    return;
  }

  try {
    const result = await loginAdmin(validation.email, validation.password);
    res.json(result);
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 401) {
      res.status(401).json({ message: (err as Error).message });
      return;
    }
    res.status(500).json({ message: 'Internal server error' });
  }
}
