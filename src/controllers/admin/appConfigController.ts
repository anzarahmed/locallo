import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import * as appConfigService from '../../services/shared/appConfigService';
import type { AppConfigPayload } from '../../types';

export async function getAppConfigs(_req: Request, res: Response): Promise<void> {
  try {
    sendSuccess(res, await appConfigService.getAllAppConfigs(), 'App configs fetched');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to load app configs');
  }
}

export async function editAppConfig(req: Request, res: Response): Promise<void> {
  try {
    const app = appConfigService.parseAppType(req.params.app);
    const config = await appConfigService.updateAppConfig(app, req.body as AppConfigPayload);
    sendSuccess(res, config, 'App config updated');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to update app config');
  }
}
