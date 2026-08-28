import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { resolvePeriodRange } from '../../utils/financialYear';
import type { PnlPeriod } from '../../utils/financialYear';
import * as pnlService from '../../services/seller/pnlService';

const VALID_PERIODS: PnlPeriod[] = ['today', 'this_month', 'this_quarter', 'financial_year', 'custom'];

export async function getPnlSummary(req: Request, res: Response): Promise<void> {
  try {
    const period = VALID_PERIODS.includes(req.query.period as PnlPeriod)
      ? (req.query.period as PnlPeriod)
      : 'financial_year';

    const fy   = req.query.fy   ? Number(req.query.fy)      : undefined;
    const from = req.query.from ? String(req.query.from)    : undefined;
    const to   = req.query.to   ? String(req.query.to)      : undefined;

    const range = resolvePeriodRange(period, { fy, from, to });
    const summary = await pnlService.getPnlSummary(req.seller!.id, range.from, range.to);
    sendSuccess(res, summary, 'P&L summary fetched');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to fetch P&L summary');
  }
}
