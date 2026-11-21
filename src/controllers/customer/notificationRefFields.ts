import type { Notification } from '../../models/Notification';
import type { NotificationType } from '../../services/notifications/templates';

export interface NotificationRefFields {
  refId?: string;
  variantId?: string | null;
}

type RefResolver = (n: Notification) => NotificationRefFields;

const productRef: RefResolver = (n) => ({
  refId: n.referenceId ?? n.data?.id ?? '',
  // Product-level rows store variantId as ''.
  variantId: n.data?.variantId || null,
});

const offerRef: RefResolver = (n) => ({
  refId: n.referenceId ?? n.data?.id ?? '',
});

// Add a type here to expose refId on it; give it its own resolver when the value differs.
const REF_RESOLVERS: Partial<Record<NotificationType, RefResolver>> = {
  wishlist_out_of_stock: productRef,
  back_in_stock: productRef,
  offer_upcoming: offerRef,
};

export function refFieldsFor(n: Notification): NotificationRefFields {
  const resolver = REF_RESOLVERS[n.type as NotificationType];
  return resolver ? resolver(n) : {};
}
