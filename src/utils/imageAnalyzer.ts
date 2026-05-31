import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AttributeField } from '../types';

export interface AnalysisResult {
  categorySlug: string | null;
  name: string | null;
  description: string | null;
  brand: string | null;
  color: string | null;
  material: string | null;
  condition: string | null;
  confidence: 'high' | 'medium' | 'low';
}

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3-flash';

function buildPrompt(categorySlugs: string[]): string {
  const slugList = categorySlugs.map(s => `- ${s}`).join('\n');
  return `You are a product cataloging assistant for an e-commerce platform. Analyze the product image and return a JSON object.

Available category slugs (pick the single most appropriate one):
${slugList}

Return ONLY a valid JSON object with exactly these fields:
{
  "categorySlug": "<slug from the list above, or null if uncertain>",
  "name": "<concise product name, max 80 characters>",
  "description": "<2-3 sentence product description highlighting key features>",
  "brand": "<brand name if visible from logo or printed text, otherwise null>",
  "color": "<primary color name in lowercase English (e.g. black, red, white), or null>",
  "material": "<material or fabric type if identifiable (e.g. cotton, stainless steel), or null>",
  "condition": "<one of: new, refurbished, used — only if clearly determinable, otherwise null>",
  "confidence": "<your confidence in the categorySlug: high, medium, or low>"
}

Rules:
- Return ONLY the raw JSON object — no markdown fences, no explanation, no extra text
- Use null (not empty string) for any field you cannot determine
- categorySlug must be exactly one slug from the list, or null`;
}

function matchSelectOption(
  aiValue: string,
  field: AttributeField,
): string | string[] | null {
  if (!field.options || field.options.length === 0) {
    return aiValue;
  }

  const lower = aiValue.toLowerCase().trim();
  const match = field.options.find(
    o => o.value.toLowerCase() === lower || o.label.toLowerCase() === lower,
  );

  if (!match) return null;

  return field.type === 'multiselect' || field.type === 'color'
    ? [match.value]
    : match.value;
}

export function mapAnalysisToAttributes(
  analysis: AnalysisResult,
  schema: AttributeField[],
): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};

  for (const field of schema) {
    let value: unknown = null;

    if ((field.key === 'brand') && analysis.brand) {
      value = field.options?.length ? matchSelectOption(analysis.brand, field) : analysis.brand;
    } else if ((field.key === 'color' || field.key === 'colors') && analysis.color) {
      value = matchSelectOption(analysis.color, field);
    } else if (field.key === 'material' && analysis.material) {
      value = field.options?.length ? matchSelectOption(analysis.material, field) : analysis.material;
    } else if (field.key === 'condition' && analysis.condition) {
      value = matchSelectOption(analysis.condition, field);
    }

    if (value !== null) {
      attrs[field.key] = value;
    }
  }

  return attrs;
}

export async function analyzeProductImage(
  buffer: Buffer,
  mimeType: string,
  categorySlugs: string[],
): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error('GEMINI_API_KEY is not configured'), { status: 503 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { responseMimeType: 'application/json' },
  });

  const result = await model.generateContent([
    buildPrompt(categorySlugs),
    { inlineData: { mimeType, data: buffer.toString('base64') } },
  ]);

  const raw = result.response.text().trim();

  let parsed: Partial<AnalysisResult>;
  try {
    parsed = JSON.parse(raw) as Partial<AnalysisResult>;
  } catch {
    throw Object.assign(new Error('Gemini returned non-JSON response'), { status: 502 });
  }

  return {
    categorySlug: typeof parsed.categorySlug === 'string' ? parsed.categorySlug : null,
    name:         typeof parsed.name         === 'string' ? parsed.name         : null,
    description:  typeof parsed.description  === 'string' ? parsed.description  : null,
    brand:        typeof parsed.brand        === 'string' ? parsed.brand        : null,
    color:        typeof parsed.color        === 'string' ? parsed.color        : null,
    material:     typeof parsed.material     === 'string' ? parsed.material     : null,
    condition:    typeof parsed.condition    === 'string' ? parsed.condition    : null,
    confidence:   (['high', 'medium', 'low'] as const).includes(parsed.confidence as 'high' | 'medium' | 'low')
                    ? (parsed.confidence as 'high' | 'medium' | 'low')
                    : 'low',
  };
}
