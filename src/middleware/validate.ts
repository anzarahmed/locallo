import type { Request, Response, NextFunction } from 'express';
import * as Yup from 'yup';
import { sendError } from '../utils/response';

export function validate(schema: Yup.ObjectSchema<Yup.AnyObject>, source: 'body' | 'query' = 'body') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = await schema.validate(source === 'query' ? req.query : req.body, { abortEarly: false });
      if (source === 'query') {
        Object.assign(req.query, validated);
      } else {
        req.body = validated;
      }
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
