import type { Request, Response } from 'express';
import { createSeller, getSellerList, getSellerById, adminUpdateSeller, updateSellerProfile, updateSellerAddress, toggleSellerStatus, getSellerSettings, updateSellerSettings, getCustomDay, setCustomDay, clearCustomDay, uploadSellerKycDocument, setSellerKycVerification } from '../../services/seller/sellerService';
import { sendSuccess, sendError, handleServiceError } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import { Category } from '../../models/Category';
import type { User } from '../../models/User';
import type { SellerProfile } from '../../models/SellerProfile';
import type { KycDocumentType, KycDocuments } from '../../types';
import { getPresignedUrl } from '../../utils/imageStorage';

const KYC_DOCUMENT_TYPES: KycDocumentType[] = ['aadhar', 'pan', 'registrationCertificate', 'other'];

async function signKycDocuments(docs: KycDocuments): Promise<KycDocuments> {
  const entries = await Promise.all(
    (Object.keys(docs) as KycDocumentType[]).map(async (type) => [type, docs[type] ? await getPresignedUrl(docs[type] as string) : null] as const),
  );
  return Object.fromEntries(entries) as unknown as KycDocuments;
}

interface CategoryObj { id: number; name: string; slug: string; attributeSchema: unknown[] }

async function resolveCats(ids: number[]): Promise<CategoryObj[]> {
  if (ids.length === 0) return [];
  const rows = await Category.findAll({ where: { id: ids }, attributes: ['id', 'name', 'slug', 'attributeSchema'] });
  return rows.map(c => ({ id: c.id, name: c.name, slug: c.slug, attributeSchema: c.attributeSchema ?? [] }));
}

function buildSellerResponse(user: User, profile: SellerProfile, categories: CategoryObj[]) {
  return {
    id: user.id,
    mobile: user.mobile,
    countryCode: user.countryCode,
    fullName: user.fullName,
    isActive: user.isActive,
    profile: { ...profile.toJSON(), categories },
  };
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const { user, profile } = await getSellerById(req.seller!.id);
    const categories = await resolveCats(profile.categoryIds ?? []);
    sendSuccess(res, buildSellerResponse(user, profile, categories), 'Profile fetched');
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}

export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    const notificationSettings = await getSellerSettings(req.seller!.id);
    sendSuccess(res, { notificationSettings }, 'Settings fetched');
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    const notificationSettings = await updateSellerSettings(req.seller!.id, req.body);
    sendSuccess(res, { notificationSettings }, 'Settings updated');
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}

export async function addSeller(req: Request, res: Response): Promise<void> {
  try {
    const { user, profile } = await createSeller(req.body, req.admin!.id);
    const categories = await resolveCats(profile.categoryIds ?? []);
    sendSuccess(res, buildSellerResponse(user, profile, categories), 'Seller created', 201);
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}

export async function updateSeller(req: Request, res: Response): Promise<void> {
  try {
    const { user, profile } = await updateSellerProfile(req.seller!.id, req.body);
    const categories = await resolveCats(profile.categoryIds ?? []);
    sendSuccess(res, buildSellerResponse(user, profile, categories), 'Profile updated');
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}

export async function updateAddress(req: Request, res: Response): Promise<void> {
  try {
    const profile = await updateSellerAddress(req.seller!.id, req.body);
    sendSuccess(res, { profile: profile.toJSON() }, 'Address updated');
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}

export async function adminEditSeller(req: Request, res: Response): Promise<void> {
  try {
    const { user, profile } = await adminUpdateSeller(req.params.id as string, req.body);
    const categories = await resolveCats(profile.categoryIds ?? []);
    sendSuccess(res, buildSellerResponse(user, profile, categories), 'Seller updated');
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}

export async function getSeller(req: Request, res: Response): Promise<void> {
  try {
    const { user, profile } = await getSellerById(req.params.id as string);
    const categories = await resolveCats(profile.categoryIds ?? []);
    const response = buildSellerResponse(user, profile, categories);
    response.profile.kycDocuments = await signKycDocuments(profile.kycDocuments);
    sendSuccess(res, response, 'Seller fetched');
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}

export async function uploadKycDocument(req: Request, res: Response): Promise<void> {
  try {
    const documentType = req.body.documentType as string;
    if (!KYC_DOCUMENT_TYPES.includes(documentType as KycDocumentType)) {
      sendError(res, 'Invalid document type', 422);
      return;
    }
    if (!req.file) {
      sendError(res, 'Document file is required', 422);
      return;
    }

    const kycDocuments = await uploadSellerKycDocument(req.params.id as string, documentType as KycDocumentType, req.file);
    sendSuccess(res, { kycDocuments: await signKycDocuments(kycDocuments) }, 'Document uploaded');
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}

export async function setKycVerification(req: Request, res: Response): Promise<void> {
  try {
    const verified = Boolean(req.body.verified);
    const profile = await setSellerKycVerification(req.params.id as string, verified, req.admin!.id);
    sendSuccess(res, {
      isVerified: profile.isVerified,
      verifiedBy: profile.verifiedBy,
      verifiedAt: profile.verifiedAt,
    }, verified ? 'Seller verified' : 'Verification revoked');
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}

export async function getCustomDayOverride(req: Request, res: Response): Promise<void> {
  try {
    const customDayOverride = await getCustomDay(req.seller!.id);
    sendSuccess(res, { customDayOverride }, 'Custom day fetched');
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}

export async function setCustomDayOverride(req: Request, res: Response): Promise<void> {
  try {
    const customDayOverride = await setCustomDay(req.seller!.id, req.body);
    sendSuccess(res, { customDayOverride }, 'Custom day saved');
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}

export async function clearCustomDayOverride(req: Request, res: Response): Promise<void> {
  try {
    await clearCustomDay(req.seller!.id);
    sendSuccess(res, { customDayOverride: null }, 'Custom day cleared');
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}

export async function patchSellerStatus(req: Request, res: Response): Promise<void> {
  try {
    const user = await toggleSellerStatus(req.params.id as string);
    sendSuccess(res, { id: user.id, isActive: user.isActive }, 'Status updated');
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}

export async function getSellers(req: Request, res: Response): Promise<void> {
  try {
    const { page, limit } = parsePagination(req, 50, 10);
    const offset = (page - 1) * limit;

    const sortBy    = req.query.sortBy    ? String(req.query.sortBy)    : 'createdAt';
    const sortOrder = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';
    const isActive  = req.query.isActive === 'true'
      ? true
      : req.query.isActive === 'false'
      ? false
      : undefined;
    const categoryId    = req.query.categoryId    ? Number(req.query.categoryId)    : undefined;
    const fullName      = req.query.fullName      ? String(req.query.fullName)      : undefined;
    const businessName  = req.query.businessName  ? String(req.query.businessName)  : undefined;
    const mobile        = req.query.mobile        ? String(req.query.mobile)        : undefined;

    const { sellers, total } = await getSellerList(limit, offset, {
      sortBy, sortOrder, isActive, categoryId, fullName, businessName, mobile,
    });

    const allCategoryIds = [...new Set(sellers.flatMap(u => u.sellerProfile?.categoryIds ?? []))];
    const fetchedCats = await resolveCats(allCategoryIds);
    const categoryMap = new Map(fetchedCats.map(c => [c.id, c]));

    sendSuccess(
      res,
      {
        sellers: sellers.map((user) => {
          const profileJson = user.sellerProfile ? user.sellerProfile.toJSON() : null;
          const categories = (user.sellerProfile?.categoryIds ?? [])
            .map(id => categoryMap.get(id))
            .filter((c): c is CategoryObj => c !== undefined);
          return {
            id: user.id,
            mobile: user.mobile,
            countryCode: user.countryCode,
            fullName: user.fullName,
            businessName: user.sellerProfile?.businessName ?? null,
            email: user.sellerProfile?.email ?? null,
            isActive: user.isActive,
            createdAt: user.createdAt,
            profile: profileJson ? { ...profileJson, categories } : null,
          };
        }),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      'Sellers fetched',
    );
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}
