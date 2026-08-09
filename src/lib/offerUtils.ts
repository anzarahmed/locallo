import type { BogoConfig, FlatAmountOffConfig, Offer, PercentageOffConfig } from '../types';

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function hasOfferStarted(offer: Offer): boolean {
  return new Date() >= new Date(offer.startDate);
}

export function offerTypeLabel(offer: Offer): string {
  switch (offer.offerType) {
    case 'percentage_off': return 'Percentage Off';
    case 'flat_amount_off': return 'Flat Amount Off';
    case 'bogo': return 'Buy One Get One';
  }
}

export function offerSummary(offer: Offer): string {
  switch (offer.offerType) {
    case 'percentage_off': {
      const c = offer.config as PercentageOffConfig;
      return `${c.discountPercent}% off${c.maxDiscountCap ? ` (up to ₹${c.maxDiscountCap})` : ''} on selected products`;
    }
    case 'flat_amount_off': {
      const c = offer.config as FlatAmountOffConfig;
      return `₹${c.flatAmount} off on selected products`;
    }
    case 'bogo': {
      const c = offer.config as BogoConfig;
      const freeText = c.getDiscountPercent >= 100 ? 'free' : `at ${c.getDiscountPercent}% off`;
      return `Buy ${c.buyQty}, get ${c.getQty} ${freeText}`;
    }
  }
}
