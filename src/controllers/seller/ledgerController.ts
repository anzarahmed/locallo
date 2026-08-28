import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import * as ledgerService from '../../services/seller/ledgerService';

export async function addLedger(req: Request, res: Response): Promise<void> {
  try {
    const ledger = await ledgerService.createLedger(req.seller!.id, String(req.body.name).trim());
    sendSuccess(res, { ledger }, 'Ledger created', 201);
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to create ledger');
  }
}

export async function getLedgers(req: Request, res: Response): Promise<void> {
  const ledgers = await ledgerService.listLedgers(req.seller!.id);
  sendSuccess(res, { ledgers }, 'Ledgers fetched');
}

export async function editLedger(req: Request, res: Response): Promise<void> {
  try {
    const ledger = await ledgerService.updateLedger(req.seller!.id, String(req.params.id), String(req.body.name).trim());
    sendSuccess(res, { ledger }, 'Ledger updated');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to update ledger');
  }
}

export async function removeLedger(req: Request, res: Response): Promise<void> {
  try {
    await ledgerService.deleteLedger(req.seller!.id, String(req.params.id));
    sendSuccess(res, null, 'Ledger deleted');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to delete ledger');
  }
}
