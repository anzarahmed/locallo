import type { Request, Response, NextFunction } from 'express';
import * as Yup from 'yup';
import { sendError } from '../utils/response';

export function validate(schema: Yup.ObjectSchema<Yup.AnyObject>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.validate(req.body, { abortEarly: false, stripUnknown: true });
      next();
    } catch (err: unknown) {
      if (err instanceof Yup.ValidationError) {
        sendError(res, 'Validation failed', 422, err.errors);
        return;
      }
      next(err);
    }
  };
}
