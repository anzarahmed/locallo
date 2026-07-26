import type { Request, Response } from 'express';
import { sendSuccess, sendError, handleServiceError } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import { saveImage, getPresignedUrl, getPresignedUrlOrNull } from '../../utils/imageStorage';
import * as bannerService from '../../services/admin/bannerService';
import type { Banner } from '../../models/Banner';

async function withSignedImage(banner: Banner): Promise<Record<string, unknown>> {
  const json = banner.toJSON() as Record<string, unknown>;
  return { ...json, image: await getPresignedUrlOrNull(json.image as string | null) };
}

export async function getBanners(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req, 100);
  const sortBy      = req.query.sortBy    ? String(req.query.sortBy) : undefined;
  const sortOrder   = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';
  const brandIdRaw  = req.query.brandId;
  const brandId     = brandIdRaw ? Number(brandIdRaw) : undefined;
  const isActiveRaw = req.query.isActive;
  const isActive    = isActiveRaw === 'true' ? true : isActiveRaw === 'false' ? false : undefined;

  const { rows, count } = await bannerService.listBanners(
    { brandId, isActive, sortBy, sortOrder },
    page,
    limit,
  );
  const banners = await Promise.all(rows.map(withSignedImage));
  sendSuccess(res, { banners, total: count, page, limit }, 'Banners fetched');
}

export async function uploadBannerImage(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    sendError(res, 'No image file provided', 400);
    return;
  }
  try {
    const key = await saveImage(req.file, 'banners');
    const url = await getPresignedUrl(key);
    sendSuccess(res, { url }, 'Image uploaded', 201);
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to upload image');
  }
}

export async function addBanner(req: Request, res: Response): Promise<void> {
  try {
    const banner = await bannerService.createBanner(
      req.body as Parameters<typeof bannerService.createBanner>[0],
      req.admin!.id,
    );
    const signed = await withSignedImage(banner);
    sendSuccess(res, { banner: signed }, 'Banner created', 201);
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to create banner');
  }
}

export async function editBanner(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const banner = await bannerService.updateBanner(id, req.body as Parameters<typeof bannerService.updateBanner>[1]);
    const signed = await withSignedImage(banner);
    sendSuccess(res, { banner: signed }, 'Banner updated');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to update banner');
  }
}

export async function removeBanner(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    await bannerService.deleteBanner(id);
    sendSuccess(res, null, 'Banner deleted');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to delete banner');
  }
}
