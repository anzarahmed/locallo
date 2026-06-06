import { Category } from '../../models/Category';
import { saveImage } from '../../utils/imageStorage';
import { analyzeProductImage, mapAnalysisToAttributes } from '../../utils/imageAnalyzer';
import type { AttributeField } from '../../types';

export interface ImageAnalysisResponse {
  imageUrl: string;
  suggestions: {
    name: string | null;
    description: string | null;
    categoryId: number | null;
    categorySlug: string | null;
    categoryName: string | null;
    confidence: 'high' | 'medium' | 'low';
    attributes: Record<string, unknown>;
  } | null;
  attributeSchema: AttributeField[];
}

export async function analyzeAndSaveImage(
  file: Express.Multer.File,
  sellerId: string,
): Promise<ImageAnalysisResponse> {
  const imageUrl = await saveImage(file, sellerId);

  if (!process.env.GEMINI_API_KEY) {
    return { imageUrl, suggestions: null, attributeSchema: [] };
  }

  const categories = await Category.findAll({
    where: { isActive: true },
    attributes: ['id', 'name', 'slug', 'attributeSchema'],
    order: [['sort_order', 'ASC']],
  });

  const slugs = categories.map(c => c.slug);

  let analysis;
  try {
    analysis = await analyzeProductImage(file.buffer, file.mimetype, slugs);
  } catch (err) {
    console.error('[imageAnalysis] Gemini error:', err);
    return { imageUrl, suggestions: null, attributeSchema: [] };
  }

  const matchedCategory = analysis.categorySlug
    ? categories.find(c => c.slug === analysis.categorySlug) ?? null
    : null;

  const schema: AttributeField[] = matchedCategory?.attributeSchema ?? [];
  const attributes = mapAnalysisToAttributes(analysis, schema);

  return {
    imageUrl,
    suggestions: {
      name:         analysis.name,
      description:  analysis.description,
      categoryId:   matchedCategory?.id ?? null,
      categorySlug: matchedCategory?.slug ?? null,
      categoryName: matchedCategory?.name ?? null,
      confidence:   analysis.confidence,
      attributes,
    },
    attributeSchema: schema,
  };
}
