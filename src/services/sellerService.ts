import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { ProfileResponse, ProductsResponse, SellerCategory, Product, ImageAnalysisResult, ProductVariant, DashboardStats, SoldLogsResponse, CustomDayOverride, TopProduct, ProductBoost, ProductReviewsResponse } from '../types';

export function getDashboardStats(): Promise<DashboardStats> {
  return apiGet(PATHS.DASHBOARD.STATS);
}

export function getTopProducts(): Promise<{ products: TopProduct[] }> {
  return apiGet(PATHS.DASHBOARD.TOP_PRODUCTS);
}

export function getProfile(): Promise<ProfileResponse> {
  return apiGet(PATHS.PROFILE);
}

export function updateProfile(data: Record<string, unknown>): Promise<ProfileResponse> {
  return apiPut(PATHS.PROFILE, data);
}

export function updateAddress(data: { address: string; lat: number; long: number }): Promise<unknown> {
  return apiPut(PATHS.ADDRESS, data);
}

export function deleteAccount(): Promise<unknown> {
  return apiDelete(PATHS.ACCOUNT);
}

export function getCategories(): Promise<{ categories: SellerCategory[] }> {
  return apiGet(PATHS.CATEGORIES);
}

export function getProducts(params?: {
  page?: number;
  limit?: number;
  filter?: 'all' | 'visible' | 'hidden';
  sortBy?: string;
}): Promise<ProductsResponse> {
  return apiGet(PATHS.PRODUCTS, params);
}

export function toggleProduct(id: string): Promise<unknown> {
  return apiPatch(`${PATHS.PRODUCTS}/${id}/toggle`);
}

export function deleteProduct(id: string): Promise<unknown> {
  return apiDelete(`${PATHS.PRODUCTS}/${id}`);
}

export function uploadProductImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('image', file);
  return apiPost<{ url: string }>(PATHS.UPLOAD_IMAGE, form);
}

export function analyzeProductImage(file: File): Promise<ImageAnalysisResult> {
  const form = new FormData();
  form.append('image', file);
  return apiPost<ImageAnalysisResult>(PATHS.ANALYZE_IMAGE, form);
}

export function createProduct(data: Record<string, unknown>): Promise<{ product: Product }> {
  return apiPost<{ product: Product }>(PATHS.PRODUCTS, data);
}

export function getSellerProduct(id: string): Promise<{ product: Product }> {
  return apiGet<{ product: Product }>(`${PATHS.PRODUCTS}/${id}`);
}

export function updateProduct(id: string, data: Record<string, unknown>): Promise<{ product: Product }> {
  return apiPut<{ product: Product }>(`${PATHS.PRODUCTS}/${id}`, data);
}

export function getProductReviews(
  productId: string,
  params?: { page?: number; limit?: number },
): Promise<ProductReviewsResponse> {
  return apiGet(PATHS.PRODUCT_REVIEWS(productId), params);
}

export function getProductVariants(productId: string): Promise<{ product: Product; variants: ProductVariant[] }> {
  return apiGet(`${PATHS.PRODUCTS}/${productId}/variants`);
}

export function createVariant(productId: string, data: Record<string, unknown>): Promise<{ variant: ProductVariant }> {
  return apiPost(`${PATHS.PRODUCTS}/${productId}/variants`, data);
}

export function createBatchVariants(productId: string, data: Record<string, unknown>): Promise<{ variants: ProductVariant[] }> {
  return apiPost(`${PATHS.PRODUCTS}/${productId}/variants/batch`, data);
}

export function updateVariant(productId: string, variantId: string, data: Record<string, unknown>): Promise<{ variant: ProductVariant }> {
  return apiPut(`${PATHS.PRODUCTS}/${productId}/variants/${variantId}`, data);
}

export function deleteVariant(productId: string, variantId: string): Promise<unknown> {
  return apiDelete(`${PATHS.PRODUCTS}/${productId}/variants/${variantId}`);
}

export function toggleVariant(productId: string, variantId: string): Promise<{ variant: ProductVariant }> {
  return apiPatch(`${PATHS.PRODUCTS}/${productId}/variants/${variantId}/toggle`);
}

export interface NotificationSettings {
  pushNotifications: boolean;
  emailUpdates: boolean;
  smsAlerts: boolean;
  offersAndPromotions: boolean;
  wishlistPriceDrops: boolean;
  sellerUpdates: boolean;
}

export function getCustomDay(): Promise<{ customDayOverride: CustomDayOverride | null }> {
  return apiGet(PATHS.CUSTOM_DAY);
}

export function setCustomDay(data: CustomDayOverride): Promise<{ customDayOverride: CustomDayOverride }> {
  return apiPut(PATHS.CUSTOM_DAY, data);
}

export function clearCustomDay(): Promise<{ customDayOverride: null }> {
  return apiDelete(PATHS.CUSTOM_DAY);
}

export function getSettings(): Promise<{ notificationSettings: NotificationSettings | null }> {
  return apiGet(PATHS.SETTINGS);
}

export function updateSettings(data: NotificationSettings): Promise<{ notificationSettings: NotificationSettings }> {
  return apiPut(PATHS.SETTINGS, data);
}

export function markProductSold(productId: string, quantity: number): Promise<unknown> {
  return apiPost(PATHS.PRODUCT_SELL(productId), { quantity });
}

export function markVariantSold(productId: string, variantId: string, quantity: number): Promise<unknown> {
  return apiPost(PATHS.VARIANT_SELL(productId, variantId), { quantity });
}

export interface CreateBoostPayload {
  type: 0 | 1 | 2;
  state?: string;
  city?: string;
  budget: number;
}

export function createBoost(
  productId: string,
  data: CreateBoostPayload,
): Promise<{ boost: ProductBoost; razorpayKeyId: string }> {
  return apiPost(PATHS.PRODUCT_BOOST(productId), data);
}

export function getActiveBoost(productId: string): Promise<{ boost: ProductBoost | null }> {
  return apiGet(PATHS.PRODUCT_BOOST(productId));
}

export function cancelBoost(productId: string): Promise<Record<string, never>> {
  return apiPatch(PATHS.PRODUCT_BOOST_CANCEL(productId), {});
}

export function getSoldLogs(params?: {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
}): Promise<SoldLogsResponse> {
  return apiGet(PATHS.SOLD_LOGS, params);
}
