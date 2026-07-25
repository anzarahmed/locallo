import type { Request, Response } from 'express';
import { sendSuccess, sendError, handleServiceError } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import { saveImage, getPresignedUrl, getPresignedUrlOrNull } from '../../utils/imageStorage';
import * as brandService from '../../services/admin/brandService';
import type { Brand } from '../../models/Brand';

async function withSignedLogo(brand: Brand): Promise<Record<string, unknown>> {
  const json = brand.toJSON() as Record<string, unknown>;
  return { ...json, logo: await getPresignedUrlOrNull(json.logo as string | null) };
}

export async function getBrands(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req, 100);
  const search      = req.query.search  ? String(req.query.search)  : undefined;
  const sortBy      = req.query.sortBy  ? String(req.query.sortBy)  : undefined;
  const sortOrder   = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';
  const isActiveRaw = req.query.isActive;
  const isActive    = isActiveRaw === 'true' ? true : isActiveRaw === 'false' ? false : undefined;

  const { rows, count } = await brandService.listBrands(
    { search, isActive, sortBy, sortOrder },
    page,
    limit,
  );
  const brands = await Promise.all(rows.map(withSignedLogo));
  sendSuccess(res, { brands, total: count, page, limit }, 'Brands fetched');
}

export async function uploadBrandLogo(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    sendError(res, 'No logo file provided', 400);
    return;
  }
  try {
    const key = await saveImage(req.file, 'brands');
    const url = await getPresignedUrl(key);
    sendSuccess(res, { url }, 'Logo uploaded', 201);
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to upload logo');
  }
}

export async function addBrand(req: Request, res: Response): Promise<void> {
  try {
    const brand = await brandService.createBrand(req.body as Parameters<typeof brandService.createBrand>[0]);
    const signed = await withSignedLogo(brand);
    sendSuccess(res, { brand: signed }, 'Brand created', 201);
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to create brand');
  }
}

export async function editBrand(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const brand = await brandService.updateBrand(id, req.body as Parameters<typeof brandService.updateBrand>[1]);
    const signed = await withSignedLogo(brand);
    sendSuccess(res, { brand: signed }, 'Brand updated');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to update brand');
  }
}

export async function removeBrand(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    await brandService.deleteBrand(id);
    sendSuccess(res, null, 'Brand deleted');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to delete brand');
  }
}
