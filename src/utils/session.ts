import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Session } from '../models/Session';
import { registerPushToken } from '../services/notifications/pushTokenService';

const SESSION_TTL_DAYS = 30;

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createUserSession(
  userId: string,
  role: string,
  deviceId: string,
  deviceType: string,
  pushToken?: string | null,
): Promise<string> {
  const token = jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET as string,
    { expiresIn: `${SESSION_TTL_DAYS}d` },
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  const session = await Session.create({
    actorType: 'user',
    actorId: userId,
    tokenHash: hashToken(token),
    deviceId,
    deviceType,
    expiresAt,
  });
  if (pushToken) await registerPushToken(session.id, pushToken);

  return token;
}
