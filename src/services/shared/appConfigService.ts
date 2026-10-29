import { AppConfig } from '../../models/AppConfig';
import sequelize from '../../config/database';
import type { AppConfigPayload, AppPlatform, AppType, PlatformAppConfig } from '../../types';

export const APP_TYPES: AppType[] = ['customer', 'seller'];
const PLATFORMS: AppPlatform[] = ['android', 'ios'];

const DEFAULT_PLATFORM_CONFIG: PlatformAppConfig = {
  version_code: 1,
  is_force_update: false,
  is_app_maintanance: false,
};

function toPlatformConfig(row: AppConfig | undefined): PlatformAppConfig {
  if (!row) return { ...DEFAULT_PLATFORM_CONFIG };
  return {
    version_code: row.versionCode,
    is_force_update: row.isForceUpdate,
    is_app_maintanance: row.isAppMaintenance,
  };
}

export function parseAppType(raw: unknown): AppType {
  if (APP_TYPES.includes(raw as AppType)) return raw as AppType;
  throw Object.assign(new Error('App must be customer or seller'), { status: 404 });
}

export async function getAppConfig(app: AppType): Promise<AppConfigPayload> {
  const rows = await AppConfig.findAll({ where: { app } });
  const byPlatform = new Map(rows.map(r => [r.platform, r]));
  return {
    android: toPlatformConfig(byPlatform.get('android')),
    ios: toPlatformConfig(byPlatform.get('ios')),
  };
}

export async function getAllAppConfigs(): Promise<Record<AppType, AppConfigPayload>> {
  const [customer, seller] = await Promise.all(APP_TYPES.map(getAppConfig));
  return { customer, seller };
}

export async function updateAppConfig(app: AppType, data: AppConfigPayload): Promise<AppConfigPayload> {
  await sequelize.transaction(async (transaction) => {
    for (const platform of PLATFORMS) {
      const cfg = data[platform];
      await AppConfig.upsert(
        {
          app,
          platform,
          versionCode: cfg.version_code,
          isForceUpdate: cfg.is_force_update,
          isAppMaintenance: cfg.is_app_maintanance,
        },
        { transaction, conflictFields: ['app', 'platform'] },
      );
    }
  });
  return getAppConfig(app);
}
