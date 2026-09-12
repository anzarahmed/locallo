import { Op, literal, fn, col } from 'sequelize';
import { Product } from '../../models/Product';
import { ProductVariant } from '../../models/ProductVariant';
import { Category } from '../../models/Category';
import { SellerProfile } from '../../models/SellerProfile';
import { OfferProduct } from '../../models/OfferProduct';
import { Review } from '../../models/Review';
import { normalizeForMatch, isNumericToken } from '../../utils/searchTokens';
import type { AttributeField } from '../../types';

interface BrowseFilter {
  categoryId?: number;
  brandId?: number;
  sellerId?: string;
  offerId?: number;
  search?: string;
  lat?: number;
  lng?: number;
  excludeProductIds?: string[];
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

export const TRENDING_LIMIT = 15;
const SIMILAR_LIMIT = 10;
export const TRENDING_ATTRIBUTES = ['id', 'name', 'categoryId', 'mrp', 'sellingPrice', 'images'];

const SAFE_PRODUCT_ATTRIBUTES = [
  'id', 'sellerId', 'categoryId', 'name', 'description',
  'sellingPrice', 'mrp', 'stock', 'images', 'attributes',
  'isActive', 'createdAt', 'updatedAt',
];

const SELLER_LAT_SUBQUERY = '(SELECT lat FROM seller_profiles WHERE seller_profiles.user_id = "Product"."seller_id")';
const SELLER_LONG_SUBQUERY = '(SELECT long FROM seller_profiles WHERE seller_profiles.user_id = "Product"."seller_id")';
export const SELLER_VERIFIED_CONDITION = literal(
  'EXISTS (SELECT 1 FROM seller_profiles WHERE seller_profiles.user_id = "Product"."seller_id" AND seller_profiles.is_verified = true)',
);

type Escape = (value: string) => string;

function matchConditionSql(columnExpr: string, token: string, escape: Escape): string {
  const parts = [`${columnExpr} ILIKE ${escape(`%${token}%`)}`];

  const normalizedToken = normalizeForMatch(token);
  if (normalizedToken) {
    parts.push(`regexp_replace(lower(${columnExpr}), '[^a-z0-9]', '', 'g') ILIKE ${escape(`%${normalizedToken}%`)}`);
  }

  if (isNumericToken(token)) {
    parts.push(`${columnExpr} ~* ('\\y' || ${escape(token)} || '\\y')`);
  }

  return `(${parts.join(' OR ')})`;
}

function attributeMatchSql(token: string, escape: Escape): string {
  const valueCondition = matchConditionSql('a.value', token, escape);

  const labelCondition =
    'EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE((SELECT attribute_schema FROM categories WHERE id = "Product"."category_id"), \'[]\'::jsonb)) AS field, ' +
    "jsonb_array_elements(COALESCE(field->'options', '[]'::jsonb)) AS opt " +
    "WHERE field->>'key' = a.key AND opt->>'value' = a.value " +
    `AND ${matchConditionSql("(opt->>'label')", token, escape)})`;

  return `(${valueCondition} OR ${labelCondition})`;
}

export interface SearchCondition {
  condition: ReturnType<typeof literal>;
  titleMatchScoreExpr: ReturnType<typeof literal>;
}

export function buildSearchCondition(search: string, escape: Escape): SearchCondition | null {
  const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  const titleConditions = tokens.map((token) => matchConditionSql('"Product"."name"', token, escape));

  const variantConditions = tokens.map((token, i) => {
    const attrCondition = attributeMatchSql(token, escape);
    return `(${titleConditions[i]} OR EXISTS (SELECT 1 FROM jsonb_each_text(pv.attributes) a WHERE ${attrCondition}))`;
  });

  const titleOnlyBranch = `(${titleConditions.join(' AND ')})`;
  const variantBranch =
    'EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = "Product".id AND pv.is_active = true ' +
    `AND ${variantConditions.join(' AND ')})`;

  const scoreTerms = titleConditions.map((cond) => `(CASE WHEN ${cond} THEN 1 ELSE 0 END)`).join(' + ');

  return {
    condition: literal(`(${titleOnlyBranch} OR ${variantBranch})`),
    titleMatchScoreExpr: literal(`(${scoreTerms})`),
  };
}

export function getSequelizeEscape(): Escape {
  return Product.sequelize!.escape.bind(Product.sequelize) as Escape;
}

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
  const andClauses: unknown[] = [SELLER_VERIFIED_CONDITION];
  const where: Record<string, unknown> = { isActive: true, [Op.and]: andClauses };

  if (filters.categoryId !== undefined) where.categoryId = filters.categoryId;
  if (filters.sellerId !== undefined)   where.sellerId   = filters.sellerId;

  let titleMatchScoreExpr: ReturnType<typeof literal> | undefined;

  if (filters.search) {
    const built = buildSearchCondition(filters.search, getSequelizeEscape());
    if (built) {
      andClauses.push(built.condition);
      titleMatchScoreExpr = built.titleMatchScoreExpr;
    }
  }

  if (filters.brandId !== undefined) {
    const sellerProfiles = await SellerProfile.findAll({
      where: { brandIds: { [Op.contains]: [filters.brandId] } },
      attributes: ['userId'],
    });
    const sellerIds = sellerProfiles.map(p => p.userId);
    if (sellerIds.length === 0) return { rows: [], count: 0 };
    where.sellerId = { [Op.in]: sellerIds };
  }

  if (filters.offerId !== undefined) {
    const offerProducts = await OfferProduct.findAll({
      where: { offerId: filters.offerId },
      attributes: ['productId'],
    });
    let productIds = offerProducts.map(op => op.productId);
    if (filters.excludeProductIds?.length) {
      const excludeSet = new Set(filters.excludeProductIds);
      productIds = productIds.filter(id => !excludeSet.has(id));
    }
    if (productIds.length === 0) return { rows: [], count: 0 };
    where.id = { [Op.in]: productIds };
  } else if (filters.excludeProductIds?.length) {
    where.id = { [Op.notIn]: filters.excludeProductIds };
  }

  const hasLocation = filters.lat !== undefined && filters.lng !== undefined;

  const attributes: unknown[] = [...TRENDING_ATTRIBUTES];
  if (hasLocation) {
    attributes.push([distanceExpression(filters.lat as number, filters.lng as number), 'distanceKm']);
  }
  if (titleMatchScoreExpr) {
    attributes.push([titleMatchScoreExpr, 'titleMatchScore']);
  }

  const order: unknown[] = [];
  if (titleMatchScoreExpr) {
    order.push([literal('"titleMatchScore"'), 'DESC']);
  }
  if (hasLocation) {
    order.push([literal('"distanceKm"'), 'ASC']);
  }
  order.push(['createdAt', 'DESC']);

  return Product.findAndCountAll({
    attributes: attributes as never,
    where,
    order: order as never,
    limit,
    offset: (page - 1) * limit,
  });
}

async function getProductRating(productId: string): Promise<number> {
  const stats = await Review.findOne({
    attributes: [[fn('AVG', col('rating')), 'avgRating']],
    where: { productId },
    raw: true,
  }) as unknown as { avgRating: string | null } | null;

  return stats?.avgRating ? Math.round(parseFloat(stats.avgRating) * 10) / 10 : 0;
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
): Promise<{ product: Product; seller: ProductSellerDetail; variants: ProductVariantDetail[]; rating: number }> {
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

  const [sellerProfile, rating] = await Promise.all([
    SellerProfile.findOne({
      where: { userId: product.sellerId },
      attributes: ['businessName', 'address', 'lat', 'long'],
    }),
    getProductRating(id),
  ]);

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
      rating,
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
    return { product, seller, rating, variants: [toVariantDetail(variantRow)] };
  }

  const variantRows = await ProductVariant.findAll({
    where: { productId: id, isActive: true },
    order: [['createdAt', 'ASC']],
  });

  if (variantRows.length === 0) {
    throw Object.assign(new Error('Variant not found'), { status: 404 });
  }

  return { product, seller, rating, variants: variantRows.map(toVariantDetail) };
}

export async function getTrendingProducts(
  excludeProductIds: string[] = [],
  limit: number = TRENDING_LIMIT,
): Promise<Product[]> {
  const where: Record<string, unknown> = { isActive: true, [Op.and]: [SELLER_VERIFIED_CONDITION] };
  if (excludeProductIds.length) where.id = { [Op.notIn]: excludeProductIds };

  return Product.findAll({
    attributes: TRENDING_ATTRIBUTES,
    where,
    order: [['createdAt', 'DESC']],
    limit,
  });
}

export async function getSimilarProducts(productId: string): Promise<Product[]> {
  const source = await Product.findOne({
    where: { id: productId, isActive: true },
    attributes: ['id', 'categoryId'],
  });

  if (!source) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  return Product.findAll({
    attributes: TRENDING_ATTRIBUTES,
    where: {
      isActive: true,
      categoryId: source.categoryId,
      id: { [Op.ne]: productId },
      [Op.and]: [SELLER_VERIFIED_CONDITION],
    },
    order: [['createdAt', 'DESC']],
    limit: SIMILAR_LIMIT,
  });
}

export async function getCategoryAttributeSchemas(categoryIds: number[]): Promise<Map<number, AttributeField[]>> {
  const map = new Map<number, AttributeField[]>();
  if (categoryIds.length === 0) return map;

  const categoryRows = await Category.findAll({
    where: { id: { [Op.in]: categoryIds } },
    attributes: ['id', 'attributeSchema'],
  });

  for (const category of categoryRows) {
    map.set(category.id, (category.attributeSchema as AttributeField[] | undefined) ?? []);
  }

  return map;
}
