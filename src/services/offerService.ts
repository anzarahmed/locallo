import { apiGet, apiPost } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { AcceptedOffersResponse, OfferDetailResponse, OffersResponse } from '../types';

export function getOffers(params?: { page?: number; limit?: number }): Promise<OffersResponse> {
  return apiGet(PATHS.OFFERS, params);
}

export function getAcceptedOffers(params?: { page?: number; limit?: number }): Promise<AcceptedOffersResponse> {
  return apiGet(PATHS.ACCEPTED_OFFERS, params);
}

export function getOffer(id: number): Promise<OfferDetailResponse> {
  return apiGet(PATHS.OFFER_BY_ID(id));
}

export function acceptOffer(id: number, productIds: string[]): Promise<{ acceptedProductIds: string[] }> {
  return apiPost(PATHS.OFFER_ACCEPT(id), { productIds });
}
