import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging, type Message } from 'firebase-admin/messaging';
import type { PushOptions } from '../types';

const FCM_BATCH_SIZE = 500;

const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

const RETRYABLE_CODES = new Set([
  'messaging/unavailable',
  'messaging/internal-error',
  'messaging/server-unavailable',
  'messaging/quota-exceeded',
  'messaging/message-rate-exceeded',
  'messaging/device-message-rate-exceeded',
  'app/network-error',
  'app/network-timeout',
]);

let firebaseApp: App | null | undefined;

function getFirebaseApp(): App | null {
  if (firebaseApp !== undefined) return firebaseApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) {
    firebaseApp = null;
    return firebaseApp;
  }

  firebaseApp = getApps()[0] ?? initializeApp({
    // .env files store the PEM on one line with literal "\n" sequences.
    credential: cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') }),
  });
  return firebaseApp;
}

export function isPushConfigured(): boolean {
  return getFirebaseApp() !== null;
}

export interface PushContent {
  title: string;
  body: string;
  data: Record<string, string>;
  badge: number;
  options: PushOptions;
}

export type TokenOutcome = 'sent' | 'invalid_token' | 'retryable' | 'failed';

export interface TokenResult {
  token: string;
  outcome: TokenOutcome;
  error?: string;
}

export function buildPushMessage(token: string, content: PushContent): Message {
  const { options } = content;
  const isTransactional = options.pushClass === 'transactional';
  const expiresAtMs = options.expiresAt ? Date.parse(options.expiresAt) : null;

  return {
    token,
    notification: {
      title: content.title,
      body: content.body,
      ...(options.imageUrl ? { imageUrl: options.imageUrl } : {}),
    },
    data: content.data,
    android: {
      priority: isTransactional ? 'high' : 'normal',
      ...(expiresAtMs !== null ? { ttl: Math.max(0, expiresAtMs - Date.now()) } : {}),
      notification: {
        channelId: options.channel,
        sound: 'default',
        ...(options.collapseKey ? { tag: options.collapseKey } : {}),
      },
    },
    apns: {
      headers: {
        'apns-priority': isTransactional ? '10' : '5',
        'apns-push-type': 'alert',
        ...(options.collapseKey ? { 'apns-collapse-id': options.collapseKey } : {}),
        ...(expiresAtMs !== null ? { 'apns-expiration': String(Math.floor(expiresAtMs / 1000)) } : {}),
      },
      payload: {
        aps: {
          sound: 'default',
          badge: content.badge,
          threadId: options.channel,
          ...(options.imageUrl ? { mutableContent: true } : {}),
          'interruption-level': isTransactional ? 'active' : 'passive',
        },
      },
      ...(options.imageUrl ? { fcmOptions: { imageUrl: options.imageUrl } } : {}),
    },
  };
}

function classifyError(code: string, message: string): TokenOutcome {
  if (INVALID_TOKEN_CODES.has(code)) return 'invalid_token';
  // FCM v1 reports a malformed token as a generic INVALID_ARGUMENT; only the message tells it
  // apart from a malformed payload, which must not cost the device its token.
  if (code === 'messaging/invalid-argument' && /registration token/i.test(message)) return 'invalid_token';
  if (RETRYABLE_CODES.has(code)) return 'retryable';
  return 'failed';
}

export async function sendPushToTokens(tokens: string[], content: PushContent): Promise<TokenResult[]> {
  const app = getFirebaseApp();
  if (!app) throw new Error('FCM is not configured (FIREBASE_* env vars missing)');

  const messaging = getMessaging(app);
  const dryRun = process.env.FCM_DRY_RUN === 'true';
  const results: TokenResult[] = [];

  for (let i = 0; i < tokens.length; i += FCM_BATCH_SIZE) {
    const batch = tokens.slice(i, i + FCM_BATCH_SIZE);
    const response = await messaging.sendEach(batch.map((token) => buildPushMessage(token, content)), dryRun);

    response.responses.forEach((r, index) => {
      const token = batch[index];
      if (r.success) {
        results.push({ token, outcome: 'sent' });
        return;
      }
      const code = r.error?.code ?? 'unknown';
      const message = r.error?.message ?? 'Unknown FCM error';
      results.push({ token, outcome: classifyError(code, message), error: `${code}: ${message}` });
    });
  }

  return results;
}
