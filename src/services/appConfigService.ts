import { apiGet, apiPut } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { AppConfig, AppType } from '../types';

export function getAppConfigs(): Promise<Record<AppType, AppConfig>> {
  return apiGet<Record<AppType, AppConfig>>(PATHS.APP_CONFIGS.LIST);
}

export function updateAppConfig(app: AppType, data: AppConfig): Promise<AppConfig> {
  return apiPut<AppConfig>(PATHS.APP_CONFIGS.BY_APP(app), data);
}
