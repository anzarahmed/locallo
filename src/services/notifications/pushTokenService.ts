import { Op } from 'sequelize';
import sequelize from '../../config/database';
import { Session } from '../../models/Session';

export async function registerPushToken(sessionId: string, pushToken: string): Promise<void> {
  const now = new Date();
  await sequelize.transaction(async (t) => {
    // A device token belongs to whoever logged in last on that device.
    await Session.update(
      { pushToken: null, pushTokenUpdatedAt: now },
      { where: { pushToken, id: { [Op.ne]: sessionId } }, transaction: t },
    );
    await Session.update({ pushToken, pushTokenUpdatedAt: now }, { where: { id: sessionId }, transaction: t });
  });
}

export async function clearPushToken(sessionId: string): Promise<void> {
  await Session.update({ pushToken: null, pushTokenUpdatedAt: new Date() }, { where: { id: sessionId } });
}
