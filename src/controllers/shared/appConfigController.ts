import type { Request, RequestHandler, Response } from 'express';
import { getAppConfig as fetchAppConfig } from '../../services/shared/appConfigService';
import { sendSuccess, handleServiceError } from '../../utils/response';
import type { AppType } from '../../types';

export function getAppConfig(app: AppType): RequestHandler {
  return async (_req: Request, res: Response): Promise<void> => {
    try {
      sendSuccess(res, await fetchAppConfig(app), 'App config fetched');
    } catch (err: unknown) {
      handleServiceError(err, res, 'Failed to load app config');
    }
  };
}
