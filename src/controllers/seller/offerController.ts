import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import { signModelRows } from '../../utils/imageStorage';
import * as offerService from '../../services/seller/offerService';

export async function getOffers(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req);
  const { rows, count } = await offerService.listOffersForSeller(page, limit);
  sendSuccess(res, { offers: rows, total: count, page, limit }, 'Offers fetched');
}

export async function getAcceptedOffers(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req);
  const { rows, count } = await offerService.listAcceptedOffersForSeller(req.seller!.id, page, limit);
  const offers = rows.map(r => ({ ...r.offer.toJSON(), acceptedCount: r.acceptedCount }));
  sendSuccess(res, { offers, total: count, page, limit }, 'Accepted offers fetched');
}

export async function getOffer(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const { offer, acceptedProducts } = await offerService.getOfferForSeller(id, req.seller!.id);
    const signedProducts = await signModelRows(acceptedProducts);
    sendSuccess(res, {
      offer,
      acceptedProducts: signedProducts,
      acceptedProductIds: acceptedProducts.map(p => p.id),
    }, 'Offer fetched');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Offer not found');
  }
}

export async function acceptOffer(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const { productIds } = req.body as { productIds: string[] };
    const acceptedProductIds = await offerService.acceptOffer(id, req.seller!.id, productIds);
    sendSuccess(res, { acceptedProductIds }, 'Offer updated');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to accept offer');
  }
}
