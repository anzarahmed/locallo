import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import * as offerService from '../../services/admin/offerService';
import type { OfferType } from '../../types';

export async function getOffers(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req, 100);
  const sortBy       = req.query.sortBy    ? String(req.query.sortBy) : undefined;
  const sortOrder    = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';
  const search       = req.query.search ? String(req.query.search) : undefined;
  const offerType    = req.query.offerType ? (String(req.query.offerType) as OfferType) : undefined;
  const isActiveRaw  = req.query.isActive;
  const isActive     = isActiveRaw === 'true' ? true : isActiveRaw === 'false' ? false : undefined;

  const { rows, count } = await offerService.listOffers(
    { isActive, offerType, search, sortBy, sortOrder },
    page,
    limit,
  );
  sendSuccess(res, { offers: rows, total: count, page, limit }, 'Offers fetched');
}

export async function getOffer(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const offer = await offerService.getOfferById(id);
    sendSuccess(res, { offer }, 'Offer fetched');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Offer not found');
  }
}

export async function addOffer(req: Request, res: Response): Promise<void> {
  try {
    const offer = await offerService.createOffer(
      req.body as Parameters<typeof offerService.createOffer>[0],
      req.admin!.id,
    );
    sendSuccess(res, { offer }, 'Offer created', 201);
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to create offer');
  }
}

export async function editOffer(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const offer = await offerService.updateOffer(id, req.body as Parameters<typeof offerService.updateOffer>[1]);
    sendSuccess(res, { offer }, 'Offer updated');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to update offer');
  }
}

export async function toggleOfferStatus(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const offer = await offerService.toggleOffer(id);
    sendSuccess(res, { offer }, 'Offer status updated');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to update offer status');
  }
}

export async function removeOffer(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    await offerService.deleteOffer(id);
    sendSuccess(res, null, 'Offer deleted');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to delete offer');
  }
}
