import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import * as offerService from '../../services/customer/offerService';

interface OfferListItem {
  id: number;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  offerType: string;
  config: unknown;
}

export async function getOffers(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req, 50);
  const { rows, count } = await offerService.listActiveOffers(page, limit);

  const offers: OfferListItem[] = rows.map((o) => ({
    id: o.id,
    title: o.title,
    description: o.description,
    startDate: o.startDate,
    endDate: o.endDate,
    offerType: o.offerType,
    config: o.config,
  }));

  sendSuccess(res, { offers, total: count, page, limit }, 'Active offers fetched');
}
