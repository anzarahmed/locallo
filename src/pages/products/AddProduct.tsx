import { useEffect, useState, type JSX, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik, type FormikHelpers } from 'formik';
import {
  ArrowLeft, Camera, X, Plus, Sparkles, Loader2, ChevronDown,
} from 'lucide-react';
import {
  getProfile, uploadProductImage, analyzeProductImage, createProduct,
} from '../../services/sellerService';
import { addProductSchema, type AddProductFormValues } from '../../validation/productSchemas';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/axios';
import { resolveImage } from '../../lib/imageUtils';
import { normalizeAttrValues, type AttrValue } from '../../lib/attributeUtils';
import { inputCls } from '../../lib/classUtils';
import { MAX_SECONDARY_IMAGES } from '../../constants';
import {
  generateCombinations, getCombinationKey, hasStockDependentAttr,
  buildProductVariantAttrs, type VariantSelections,
} from '../../lib/variantUtils';
import FormField from '../../components/ui/FormField';
import AttrInput from '../../components/ui/AttrInput';
import type { SellerCategory, AttributeField, AttributeFieldOption } from '../../types';

interface AiHint {
  categoryName: string;
  confidence: 'high' | 'medium' | 'low';
  categoryAvailable: boolean;
}

export default function AddProduct(): JSX.Element {
  const navigate = useNavigate();
  const toast = useToast();

  const [categories, setCategories] = useState<SellerCategory[]>([]);
  const [primaryImage, setPrimaryImage] = useState<string | null>(null);
  const [secondaryImages, setSecondaryImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attributeSchema, setAttributeSchema] = useState<AttributeField[]>([]);
  const [attributes, setAttributes] = useState<Record<string, AttrValue>>({});
  const [aiHint, setAiHint] = useState<AiHint | null>(null);
  const [variantSelections, setVariantSelections] = useState<VariantSelections>({});
  const [comboStocks, setComboStocks] = useState<Record<string, string>>({});

  const variantFields = attributeSchema.filter(f => f.isVariant === true);
  const nonVariantFields = attributeSchema.filter(f => !f.isVariant);
  const stockDependent = hasStockDependentAttr(variantFields);
  const combinations = generateCombinations(variantFields, variantSelections);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const data = await getProfile();
        setCategories(data.profile.categories);
      } catch {
        // silently ignore — user can still manually select when dropdown is populated
      }
    }
    void load();
  }, []);

  const form = useFormik<AddProductFormValues>({
    initialValues: {
      name: '',
      description: '',
      categoryId: 0,
      sellingPrice: '',
      mrp: '',
      costPrice: '',
      stock: '0',
    },
    validationSchema: addProductSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: handleSubmit,
  });

  function applyCategory(id: number): void {
    const cat = categories.find(c => c.id === id);
    setAttributeSchema(cat?.attributeSchema ?? []);
    setAttributes({});
    setVariantSelections({});
    setComboStocks({});
  }

  function setVariantSelection(key: string, value: string | string[]): void {
    setVariantSelections(prev => ({ ...prev, [key]: value }));
    // Reset stock when selections change
    setComboStocks({});
  }

  async function handlePrimaryUpload(file: File): Promise<void> {
    setIsAnalyzing(true);
    try {
      const result = await analyzeProductImage(file);
      setPrimaryImage(result.imageUrl);

      if (result.suggestions) {
        const s = result.suggestions;
        const matchedCat = s.categoryId ? categories.find(c => c.id === s.categoryId) : undefined;
        void form.setValues({
          name:         s.name ?? '',
          description:  s.description ?? '',
          categoryId:   matchedCat ? s.categoryId! : 0,
          sellingPrice: form.values.sellingPrice,
          mrp:          form.values.mrp,
          costPrice:    form.values.costPrice,
          stock:        form.values.stock,
        });
        if (matchedCat) {
          const schema = result.attributeSchema.length > 0
            ? result.attributeSchema
            : (matchedCat.attributeSchema ?? []);
          setAttributeSchema(schema);
          setAttributes(normalizeAttrValues(s.attributes, schema));
          setVariantSelections({});
          setComboStocks({});
        }
        setAiHint({
          categoryName: s.categoryName ?? 'Unknown',
          confidence:   s.confidence,
          categoryAvailable: !!matchedCat,
        });
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to upload image');
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handlePrimaryChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    void handlePrimaryUpload(file);
  }

  async function handleSecondaryUpload(file: File): Promise<void> {
    setIsUploading(true);
    try {
      const { url } = await uploadProductImage(file);
      setSecondaryImages(prev => [...prev, url]);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  }

  function handleSecondaryChange(e: ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    const slots = MAX_SECONDARY_IMAGES - secondaryImages.length;
    const toUpload = files.slice(0, slots);
    toUpload.forEach(f => void handleSecondaryUpload(f));
  }

  function setAttr(key: string, value: AttrValue): void {
    setAttributes(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(
    values: AddProductFormValues,
    helpers: FormikHelpers<AddProductFormValues>,
  ): Promise<void> {
    if (!primaryImage) {
      toast.error('Please upload a primary product image');
      helpers.setSubmitting(false);
      return;
    }

    const missingRequired = nonVariantFields.filter(f => {
      if (!f.required) return false;
      const v = attributes[f.key];
      return !v || (Array.isArray(v) && v.length === 0) || v === '';
    });
    if (missingRequired.length > 0) {
      toast.error(`Required fields missing: ${missingRequired.map(f => f.label).join(', ')}`);
      helpers.setSubmitting(false);
      return;
    }

    const hasCombinations = combinations.length > 0;

    const productAttrs: Record<string, unknown> = { ...attributes, ...buildProductVariantAttrs(variantFields, variantSelections) };

    type VRow = { attributes: Record<string, string>; stock: number };
    let productRows: VRow[] | undefined;
    if (hasCombinations) {
      const sdFieldKeys = new Set(variantFields.filter(f => f.isStockDependent).map(f => f.key));
      const hasSdFields = sdFieldKeys.size > 0;
      productRows = combinations.map(combo => ({
        // When there's an SD field, rows only carry the SD-specific attr — non-SD attrs
        // (e.g. colors) are already in the top-level attributes and the backend merges them.
        // When there's no SD field every combo is unique, so include all attrs.
        attributes: hasSdFields
          ? Object.fromEntries(Object.entries(combo).filter(([k]) => sdFieldKeys.has(k)))
          : { ...combo },
        stock: hasSdFields
          ? Number(comboStocks[getCombinationKey(combo)] ?? 0)
          : Number(values.stock),
      }));
    }

    try {
      const { product } = await createProduct({
        name:         values.name,
        description:  values.description,
        categoryId:   Number(values.categoryId),
        sellingPrice: Number(values.sellingPrice),
        mrp:          values.mrp      ? Number(values.mrp)      : undefined,
        costPrice:    Number(values.costPrice),
        ...(!hasCombinations && { stock: Number(values.stock) }),
        images:       [primaryImage!, ...secondaryImages],
        attributes:   productAttrs,
        ...(productRows && { rows: productRows }),
      });

      toast.success('Product added successfully');
      navigate(product.hasVariants ? `/products/${product.id}/variants` : '/products');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to create product';
      helpers.setStatus(msg);
      toast.error(msg);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-28">
      {/* Teal header */}
      <div
        className="px-5 md:px-8 pt-8 pb-6 flex items-center gap-4"
        style={{
          background: 'linear-gradient(150deg, #26B8B2 0%, #1A9E98 45%, #14817C 100%)',
          borderRadius: '0 0 28px 28px',
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-white text-[20px] font-bold">Add Product</h1>
      </div>

      <div className="px-4 md:px-8 pt-5 max-w-2xl mx-auto space-y-4">
        {/* Primary Image */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Primary Image
            <span className="text-rose-400 ml-0.5">*</span>
          </p>

          {primaryImage ? (
            <div className="flex items-center gap-3">
              <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                <img
                  src={resolveImage(primaryImage)}
                  alt="Primary product image"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => { setPrimaryImage(null); setAiHint(null); }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  <X size={11} />
                </button>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-2">Main display image for your product</p>
                <label className={`inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 cursor-pointer hover:text-teal-700 ${isAnalyzing ? 'pointer-events-none opacity-50' : ''}`}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePrimaryChange}
                    className="hidden"
                  />
                  {isAnalyzing ? (
                    <><Loader2 size={12} className="animate-spin" /> Analyzing…</>
                  ) : (
                    'Replace image'
                  )}
                </label>
              </div>
            </div>
          ) : (
            <label className={`flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-gray-200 py-10 cursor-pointer hover:border-teal-400 transition-colors ${isAnalyzing ? 'pointer-events-none opacity-70' : ''}`}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePrimaryChange}
                className="hidden"
              />
              {isAnalyzing ? (
                <>
                  <Loader2 size={32} className="text-teal-500 animate-spin" />
                  <p className="text-sm font-semibold text-gray-500">Analyzing with AI…</p>
                  <p className="text-xs text-gray-400">This may take a few seconds</p>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center">
                    <Camera size={24} className="text-teal-500" />
                  </div>
                  <p className="text-sm font-semibold text-gray-600">Upload primary photo</p>
                  <p className="text-xs text-gray-400">AI will suggest name, category & details</p>
                </>
              )}
            </label>
          )}
        </div>

        {/* AI banner */}
        {aiHint && (
          <div className="bg-teal-50 rounded-2xl px-4 py-3 flex items-start gap-3">
            <Sparkles size={17} className="text-teal-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-teal-700">AI suggestions applied</p>
              <p className="text-xs text-teal-600 mt-0.5">
                Detected: <span className="font-medium">{aiHint.categoryName}</span>
                {' · '}
                <span className={
                  aiHint.confidence === 'high'   ? 'text-teal-600'   :
                  aiHint.confidence === 'medium' ? 'text-amber-600'  : 'text-orange-500'
                }>
                  {aiHint.confidence} confidence
                </span>
                {aiHint.categoryAvailable
                  ? '. Review and adjust as needed.'
                  : '. This category isn\'t in your profile — please select one manually.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAiHint(null)}
              className="text-teal-400 hover:text-teal-600 shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Secondary Images */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-baseline gap-1.5 mb-3">
            <p className="text-sm font-semibold text-gray-700">Secondary Images</p>
            <span className="text-xs text-gray-400 font-normal">up to {MAX_SECONDARY_IMAGES}</span>
          </div>

          {secondaryImages.length === 0 && !isUploading ? (
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-7 cursor-pointer hover:border-teal-400 transition-colors">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleSecondaryChange}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                <Plus size={20} className="text-gray-400" />
              </div>
              <p className="text-xs text-gray-400">Add extra photos of your product</p>
            </label>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {secondaryImages.map((url, i) => (
                <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  <img
                    src={resolveImage(url)}
                    alt={`Secondary ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setSecondaryImages(prev => prev.filter(u => u !== url))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              {secondaryImages.length < MAX_SECONDARY_IMAGES && (
                <label className={`w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-teal-400 transition-colors shrink-0 ${isUploading ? 'pointer-events-none opacity-60' : ''}`}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleSecondaryChange}
                    className="hidden"
                  />
                  {isUploading
                    ? <Loader2 size={18} className="text-teal-400 animate-spin" />
                    : <Plus size={20} className="text-gray-300" />
                  }
                </label>
              )}
            </div>
          )}
        </div>

        {/* Basic info */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <p className="text-sm font-semibold text-gray-700">Basic Info</p>

          <FormField label="Product Name" required error={form.touched.name ? form.errors.name : undefined}>
            <input
              name="name"
              value={form.values.name}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              placeholder="e.g. Wireless Earbuds Pro"
              className={inputCls(!!form.touched.name && !!form.errors.name)}
            />
          </FormField>

          <FormField label="Description" required error={form.touched.description ? form.errors.description : undefined}>
            <textarea
              name="description"
              value={form.values.description}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              placeholder="Describe your product…"
              rows={4}
              className={`${inputCls(!!form.touched.description && !!form.errors.description)} resize-none`}
            />
          </FormField>
        </div>

        {/* Category + Pricing */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <p className="text-sm font-semibold text-gray-700">Category & Pricing</p>

          <FormField label="Category" required error={form.touched.categoryId ? form.errors.categoryId as string : undefined}>
            <div className="relative">
              <select
                value={form.values.categoryId}
                onChange={e => {
                  const id = Number(e.target.value);
                  void form.setFieldValue('categoryId', id);
                  applyCategory(id);
                }}
                onBlur={() => void form.setFieldTouched('categoryId')}
                className={`w-full appearance-none ${inputCls(!!form.touched.categoryId && !!form.errors.categoryId)} pr-8`}
              >
                <option value={0} disabled>Select a category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Selling Price" required error={form.touched.sellingPrice ? form.errors.sellingPrice as string : undefined}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">₹</span>
                <input
                  name="sellingPrice"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.values.sellingPrice}
                  onChange={form.handleChange}
                  onBlur={form.handleBlur}
                  placeholder="0"
                  className={`${inputCls(!!form.touched.sellingPrice && !!form.errors.sellingPrice)} pl-7`}
                />
              </div>
            </FormField>
            <FormField label="MRP" error={form.touched.mrp ? form.errors.mrp as string : undefined}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">₹</span>
                <input
                  name="mrp"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.values.mrp}
                  onChange={form.handleChange}
                  onBlur={form.handleBlur}
                  placeholder="0"
                  className={`${inputCls(!!form.touched.mrp && !!form.errors.mrp)} pl-7`}
                />
              </div>
            </FormField>
          </div>

          <FormField label="Cost Price" required error={form.touched.costPrice ? form.errors.costPrice as string : undefined}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">₹</span>
              <input
                name="costPrice"
                type="number"
                min={0}
                step="0.01"
                value={form.values.costPrice}
                onChange={form.handleChange}
                onBlur={form.handleBlur}
                placeholder="0"
                className={`${inputCls(!!form.touched.costPrice && !!form.errors.costPrice)} pl-7`}
              />
            </div>
          </FormField>
        </div>

        {/* Product Attributes — non-variant text / number / textarea */}
        {nonVariantFields.some(f => f.type === 'text' || f.type === 'number' || f.type === 'textarea') && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
            <p className="text-sm font-semibold text-gray-700">Product Attributes</p>
            {nonVariantFields
              .filter(f => f.type === 'text' || f.type === 'number' || f.type === 'textarea')
              .map(field => (
                <AttrInput
                  key={field.key}
                  field={field}
                  value={attributes[field.key] ?? ''}
                  onChange={v => setAttr(field.key, v)}
                />
              ))}
          </div>
        )}

        {/* Available Options — non-variant select / multiselect / color */}
        {nonVariantFields.some(f => f.type === 'select' || f.type === 'multiselect' || f.type === 'color') && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-700">Available Options</p>
              <p className="text-xs text-gray-400 mt-0.5">Select all options this product is available in</p>
            </div>
            {nonVariantFields
              .filter(f => f.type === 'select' || f.type === 'multiselect' || f.type === 'color')
              .map(field => (
                <AttrInput
                  key={field.key}
                  field={field}
                  value={attributes[field.key] ?? (field.type === 'multiselect' ? [] : '')}
                  onChange={v => setAttr(field.key, v)}
                />
              ))}
          </div>
        )}

        {/* Variant Options — isVariant fields drive combination generation */}
        {variantFields.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-700">Variant Options</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Select options for this variant — add more colors from the Variants page
              </p>
            </div>
            {variantFields.map(field => (
              <VariantOptionField
                key={field.key}
                field={field}
                value={variantSelections[field.key]}
                onChange={v => setVariantSelection(field.key, v)}
              />
            ))}
          </div>
        )}

        {/* Stock per combination — only when stock-dependent and combinations exist */}
        {stockDependent && combinations.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-sm font-semibold text-gray-700 mb-4">Stock Quantities</p>
            <div className="space-y-2">
              {combinations.map(combo => (
                <CombinationStockRow
                  key={getCombinationKey(combo)}
                  combo={combo}
                  variantFields={variantFields}
                  stock={comboStocks[getCombinationKey(combo)] ?? '0'}
                  onChange={v => setComboStocks(prev => ({ ...prev, [getCombinationKey(combo)]: v }))}
                />
              ))}
            </div>
          </div>
        )}

        {/* Inventory — shown when not stock-dependent or no combinations yet */}
        {(!stockDependent || combinations.length === 0) && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-sm font-semibold text-gray-700 mb-4">Inventory</p>
            <FormField label="Stock Quantity" required error={form.touched.stock ? form.errors.stock as string : undefined}>
              <input
                name="stock"
                type="number"
                min={0}
                step="1"
                value={form.values.stock}
                onChange={form.handleChange}
                onBlur={form.handleBlur}
                placeholder="0"
                className={inputCls(!!form.touched.stock && !!form.errors.stock)}
              />
            </FormField>
          </div>
        )}

        {form.status && (
          <p className="text-sm text-rose-500 text-center px-2">{form.status as string}</p>
        )}
      </div>

      {/* Sticky submit */}
      <div className="fixed bottom-0 left-0 right-0 md:left-60 bg-white border-t border-gray-100 px-4 py-3 z-20">
        <div className="max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => void form.submitForm()}
            disabled={form.isSubmitting}
            className="w-full py-3.5 rounded-2xl text-white text-sm font-bold disabled:opacity-60 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1B9E98 0%, #157A75 100%)' }}
          >
            {form.isSubmitting ? 'Adding Product…' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Variant option field — drives combination generation ── */
interface VariantOptionFieldProps {
  field: AttributeField;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
}

function VariantOptionField({ field, onChange, value }: VariantOptionFieldProps): JSX.Element {
  const labelEl = (
    <div className="mb-1.5">
      <span className="text-xs font-semibold text-gray-500">{field.label}</span>
      {field.type === 'multiselect' && (
        <span className="text-gray-400 text-xs ml-1.5">(select all that apply)</span>
      )}
    </div>
  );

  if (field.type === 'multiselect' && field.options && field.options.length > 0) {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div>
        {labelEl}
        <div className="flex flex-wrap gap-2">
          {field.options.map((opt: AttributeFieldOption) => {
            const active = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(active ? selected.filter(v => v !== opt.value) : [...selected, opt.value])}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  active
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-teal-400'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === 'select' && field.options && field.options.length > 0) {
    if (field.isStockDependent) {
      // SD field (e.g. sizes): allow multiple selections so all sizes can be added at once
      const selected = Array.isArray(value) ? value : (typeof value === 'string' && value ? [value] : []);
      return (
        <div>
          {labelEl}
          <div className="flex flex-wrap gap-2">
            {field.options.map((opt: AttributeFieldOption) => {
              const active = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange(active ? selected.filter(v => v !== opt.value) : [...selected, opt.value])}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    active
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-teal-400'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    const selected = typeof value === 'string' ? value : '';
    return (
      <div>
        {labelEl}
        <div className="flex flex-wrap gap-2">
          {field.options.map((opt: AttributeFieldOption) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(selected === opt.value ? '' : opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                selected === opt.value
                  ? 'bg-teal-600 border-teal-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-teal-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // text / number / textarea
  const strVal = typeof value === 'string' ? value : '';
  return (
    <div>
      {labelEl}
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        value={strVal}
        onChange={e => onChange(e.target.value)}
        placeholder={field.unit ? `e.g. ${field.unit}` : `Enter ${field.label}`}
        className={inputCls(false)}
      />
    </div>
  );
}

/* ── Stock row per combination ── */
interface CombinationStockRowProps {
  combo: Record<string, string>;
  variantFields: AttributeField[];
  stock: string;
  onChange: (v: string) => void;
}

function CombinationStockRow({ combo, variantFields, stock, onChange }: CombinationStockRowProps): JSX.Element {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
      <div className="flex-1 flex flex-wrap gap-1.5">
        {Object.entries(combo).map(([key, val]) => {
          const field = variantFields.find(f => f.key === key);
          const opt = field?.options?.find(o => o.value === val);
          return (
            <span key={key} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full font-medium">
              {opt?.label ?? val}
            </span>
          );
        })}
      </div>
      <input
        type="number"
        min={0}
        step="1"
        value={stock}
        onChange={e => onChange(e.target.value)}
        placeholder="0"
        className="w-20 border border-gray-200 rounded-xl text-sm text-gray-700 px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-right"
      />
    </div>
  );
}
