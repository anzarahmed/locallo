import type { Request, Response } from 'express';
import * as Yup from 'yup';
import { createSellerSchema } from '../validation/sellerSchemas';
import { createSeller } from '../services/sellerService';

export async function addSeller(req: Request, res: Response): Promise<void> {
  const validation = await createSellerSchema
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
    const { user, profile } = await createSeller(validation, req.admin!.id);
    res.status(201).json({
      id: user.id,
      mobile: user.mobile,
      countryCode: user.countryCode,
      fullName: user.fullName,
      isActive: user.isActive,
      profile: profile.toJSON(),
    });
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 409) {
      res.status(409).json({ message: (err as Error).message });
      return;
    }
    res.status(500).json({ message: 'Internal server error' });
  }
}
