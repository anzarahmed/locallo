import { Op, literal } from 'sequelize';
import { Product } from '../../models/Product';
import { ProductVariant } from '../../models/ProductVariant';
import { Category } from '../../models/Category';
import { SellerProfile } from '../../models/SellerProfile';
import type { AttributeField } from '../../types';

interface BrowseFilter {
  categoryId?: number;
  brandId?: number;
  search?: string;
  lat?: number;
  lng?: number;
}

interface ProductVariantDetail {
  id: string | null;
  productId: string;
  attributes: Record<string, unknown>;
  images: string[];
  stock: number;
  sellingPrice: number | null;
  mrp: number | null;
  isActive: boolean;
}

interface ProductSellerDetail {
  id: string;
  name: string | null;
  address: string | null;
  lat: number | null;
  long: number | null;
}

const TRENDING_LIMIT = 15;
const TRENDING_ATTRIBUTES = ['id', 'name', 'mrp', 'sellingPrice', 'images'];

const SAFE_PRODUCT_ATTRIBUTES = [
  'id', 'sellerId', 'categoryId', 'name', 'description',
  'sellingPrice', 'mrp', 'stock', 'images', 'attributes',
  'isActive', 'createdAt', 'updatedAt',
];

const SELLER_LAT_SUBQUERY = '(SELECT lat FROM seller_profiles WHERE seller_profiles.user_id = "Product"."seller_id")';
const SELLER_LONG_SUBQUERY = '(SELECT long FROM seller_profiles WHERE seller_profiles.user_id = "Product"."seller_id")';

function distanceExpression(lat: number, lng: number): ReturnType<typeof literal> {
  return literal(
    `6371 * acos(least(1, greatest(-1, ` +
    `cos(radians(${lat})) * cos(radians(${SELLER_LAT_SUBQUERY})) * cos(radians(${SELLER_LONG_SUBQUERY}) - radians(${lng})) ` +
    `+ sin(radians(${lat})) * sin(radians(${SELLER_LAT_SUBQUERY})))))`,
  );
}

export async function browseProducts(
  filters: BrowseFilter,
  page: number,
  limit: number,
): Promise<{ rows: Product[]; count: number }> {
  const where: Record<string, unknown> = { isActive: true };

  if (filters.categoryId !== undefined) where.categoryId = filters.categoryId;
  if (filters.search)                   where.name       = { [Op.iLike]: `%${filters.search}%` };

  if (filters.brandId !== undefined) {
    const sellerProfiles = await SellerProfile.findAll({
      where: { brandIds: { [Op.contains]: [filters.brandId] } },
      attributes: ['userId'],
    });
    const sellerIds = sellerProfiles.map(p => p.userId);
    if (sellerIds.length === 0) return { rows: [], count: 0 };
    where.sellerId = { [Op.in]: sellerIds };
  }

  const hasLocation = filters.lat !== undefined && filters.lng !== undefined;

  const attributes = hasLocation
    ? [...TRENDING_ATTRIBUTES, [distanceExpression(filters.lat as number, filters.lng as number), 'distanceKm']]
    : TRENDING_ATTRIBUTES;

  const order = hasLocation
    ? [[literal('"distanceKm"'), 'ASC'], ['createdAt', 'DESC']]
    : [['createdAt', 'DESC']];

  return Product.findAndCountAll({
    attributes: attributes as never,
    where,
    order: order as never,
    limit,
    offset: (page - 1) * limit,
  });
}

function toVariantDetail(variantRow: ProductVariant): ProductVariantDetail {
  return {
    id: variantRow.id,
    productId: variantRow.productId,
    attributes: variantRow.attributes,
    images: variantRow.images,
    stock: variantRow.stock,
    sellingPrice: variantRow.sellingPrice,
    mrp: variantRow.mrp,
    isActive: variantRow.isActive,
  };
}

export async function getProductDetail(
  id: string,
  variantId?: string,
): Promise<{ product: Product; seller: ProductSellerDetail; variants: ProductVariantDetail[] }> {
  const product = await Product.findOne({
    attributes: SAFE_PRODUCT_ATTRIBUTES,
    where: { id, isActive: true },
    include: [
      {
        model: Category,
        attributes: ['id', 'name', 'attributeSchema'],
      },
    ],
  });

  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  if (product.category) {
    const schema = (product.category.attributeSchema as AttributeField[] | undefined) ?? [];
    product.category.attributeSchema = schema.filter(f => f.isVariant);
  }

  const sellerProfile = await SellerProfile.findOne({
    where: { userId: product.sellerId },
    attributes: ['businessName', 'address', 'lat', 'long'],
  });

  const seller: ProductSellerDetail = {
    id: product.sellerId,
    name: sellerProfile?.businessName ?? null,
    address: sellerProfile?.address ?? null,
    lat: sellerProfile?.lat ?? null,
    long: sellerProfile?.long ?? null,
  };

  const hasVariants = (await ProductVariant.count({ where: { productId: id } })) > 0;

  if (!hasVariants) {
    if (variantId) {
      throw Object.assign(new Error('Variant not found'), { status: 404 });
    }
    return {
      product,
      seller,
      variants: [{
        id: null,
        productId: product.id,
        attributes: {},
        images: product.images,
        stock: product.stock,
        sellingPrice: product.sellingPrice,
        mrp: product.mrp,
        isActive: product.isActive,
      }],
    };
  }

  if (variantId) {
    const variantRow = await ProductVariant.findOne({ where: { id: variantId, productId: id, isActive: true } });
    if (!variantRow) {
      throw Object.assign(new Error('Variant not found'), { status: 404 });
    }
    return { product, seller, variants: [toVariantDetail(variantRow)] };
  }

  const variantRows = await ProductVariant.findAll({
    where: { productId: id, isActive: true },
    order: [['createdAt', 'ASC']],
  });

  if (variantRows.length === 0) {
    throw Object.assign(new Error('Variant not found'), { status: 404 });
  }

  return { product, seller, variants: variantRows.map(toVariantDetail) };
}

export async function getTrendingProducts(): Promise<Product[]> {
  return Product.findAll({
    attributes: TRENDING_ATTRIBUTES,
    where: { isActive: true },
    order: [['createdAt', 'DESC']],
    limit: TRENDING_LIMIT,
  });
}
