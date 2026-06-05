import { useEffect, useState, type JSX, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik, type FormikHelpers } from 'formik';
import {
  ArrowLeft, Camera, X, Plus, Sparkles, Loader2, ChevronDown,
} from 'lucide-react';
import {
  getCategories, uploadProductImage, analyzeProductImage, createProduct,
} from '../../services/sellerService';
import { addProductSchema, type AddProductFormValues } from '../../validation/productSchemas';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/axios';
import type { SellerCategory, AttributeField } from '../../types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const MAX_IMAGES = 5;

type AttrValue = string | string[];

interface AiHint {
  categoryName: string;
  confidence: 'high' | 'medium' | 'low';
}

function resolveImage(url: string): string {
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

function normalizeAttrValues(
  rawAttrs: Record<string, unknown>,
  schema: AttributeField[],
): Record<string, AttrValue> {
  const out: Record<string, AttrValue> = {};
  for (const field of schema) {
    const val = rawAttrs[field.key];
    if (val === undefined || val === null) continue;
    if (field.type === 'multiselect' || field.type === 'color') {
      out[field.key] = Array.isArray(val) ? (val as string[]) : [String(val)];
    } else {
      out[field.key] = String(val);
    }
  }
  return out;
}

export default function AddProduct(): JSX.Element {
  const navigate = useNavigate();
  const toast = useToast();

  const [categories, setCategories] = useState<SellerCategory[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attributeSchema, setAttributeSchema] = useState<AttributeField[]>([]);
  const [attributes, setAttributes] = useState<Record<string, AttrValue>>({});
  const [aiHint, setAiHint] = useState<AiHint | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const { categories: cats } = await getCategories();
        setCategories(cats);
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
      stock: '',
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
  }

  async function handleFirstImage(file: File): Promise<void> {
    setIsAnalyzing(true);
    try {
      const result = await analyzeProductImage(file);
      setImages([result.imageUrl]);

      if (result.suggestions) {
        const s = result.suggestions;
        void form.setValues({
          name:         s.name ?? '',
          description:  s.description ?? '',
          categoryId:   s.categoryId ?? 0,
          sellingPrice: form.values.sellingPrice,
          mrp:          form.values.mrp,
          costPrice:    form.values.costPrice,
          stock:        form.values.stock,
        });
        if (s.categoryId) {
          const schema = result.attributeSchema.length > 0
            ? result.attributeSchema
            : (categories.find(c => c.id === s.categoryId)?.attributeSchema ?? []);
          setAttributeSchema(schema);
          setAttributes(normalizeAttrValues(s.attributes, schema));
        }
        setAiHint({
          categoryName: s.categoryName ?? 'Unknown',
          confidence:   s.confidence,
        });
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to upload image');
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleAddMore(file: File): Promise<void> {
    setIsUploading(true);
    try {
      const { url } = await uploadProductImage(file);
      setImages(prev => [...prev, url]);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    void handleFirstImage(file);
  }

  function handleAddMoreChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    void handleAddMore(file);
  }

  function setAttr(key: string, value: AttrValue): void {
    setAttributes(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(
    values: AddProductFormValues,
    helpers: FormikHelpers<AddProductFormValues>,
  ): Promise<void> {
    if (images.length === 0) {
      toast.error('Please upload at least one product image');
      helpers.setSubmitting(false);
      return;
    }

    const missingRequired = attributeSchema.filter(f => {
      if (!f.required) return false;
      const v = attributes[f.key];
      return !v || (Array.isArray(v) && v.length === 0) || v === '';
    });
    if (missingRequired.length > 0) {
      toast.error(`Required fields missing: ${missingRequired.map(f => f.label).join(', ')}`);
      helpers.setSubmitting(false);
      return;
    }

    try {
      await createProduct({
        name:         values.name,
        description:  values.description,
        categoryId:   Number(values.categoryId),
        sellingPrice: Number(values.sellingPrice),
        mrp:          values.mrp      ? Number(values.mrp)      : undefined,
        costPrice:    values.costPrice ? Number(values.costPrice) : undefined,
        stock:        Number(values.stock),
        images,
        attributes,
      });
      toast.success('Product added successfully');
      navigate('/products');
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
        className="px-5 pt-8 pb-6 flex items-center gap-4"
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

      <div className="px-4 pt-5 max-w-2xl mx-auto space-y-4">
        {/* Images */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Product Images
            <span className="text-rose-400 ml-0.5">*</span>
          </p>

          {images.length === 0 ? (
            <label className={`flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-gray-200 py-10 cursor-pointer hover:border-teal-400 transition-colors ${isAnalyzing ? 'pointer-events-none opacity-70' : ''}`}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
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
                  <p className="text-sm font-semibold text-gray-600">Upload product photo</p>
                  <p className="text-xs text-gray-400">AI will suggest name, category & details</p>
                </>
              )}
            </label>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {images.map((url, i) => (
                <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  <img
                    src={resolveImage(url)}
                    alt={`Product ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImages(prev => prev.filter(u => u !== url))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <label className={`w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-teal-400 transition-colors shrink-0 ${isUploading ? 'pointer-events-none opacity-60' : ''}`}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAddMoreChange}
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
                . Review and adjust as needed.
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

        {/* Basic info */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <p className="text-sm font-semibold text-gray-700">Basic Info</p>

          <Field label="Product Name" required error={form.touched.name ? form.errors.name : undefined}>
            <input
              name="name"
              value={form.values.name}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              placeholder="e.g. Wireless Earbuds Pro"
              className={inputCls(!!form.touched.name && !!form.errors.name)}
            />
          </Field>

          <Field label="Description" required error={form.touched.description ? form.errors.description : undefined}>
            <textarea
              name="description"
              value={form.values.description}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              placeholder="Describe your product…"
              rows={4}
              className={`${inputCls(!!form.touched.description && !!form.errors.description)} resize-none`}
            />
          </Field>
        </div>

        {/* Category + Pricing */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <p className="text-sm font-semibold text-gray-700">Category & Pricing</p>

          <Field label="Category" required error={form.touched.categoryId ? form.errors.categoryId as string : undefined}>
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
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Selling Price" required error={form.touched.sellingPrice ? form.errors.sellingPrice as string : undefined}>
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
            </Field>
            <Field label="MRP" error={form.touched.mrp ? form.errors.mrp as string : undefined}>
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
            </Field>
          </div>

          <Field label="Cost Price (optional)" error={form.touched.costPrice ? form.errors.costPrice as string : undefined}>
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
          </Field>
        </div>

        {/* Inventory */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-4">Inventory</p>
          <Field label="Stock Quantity" required error={form.touched.stock ? form.errors.stock as string : undefined}>
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
          </Field>
        </div>

        {/* Dynamic attributes */}
        {attributeSchema.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
            <p className="text-sm font-semibold text-gray-700">Product Details</p>
            {attributeSchema.map(field => (
              <AttrInput
                key={field.key}
                field={field}
                value={attributes[field.key] ?? (field.type === 'multiselect' || field.type === 'color' ? [] : '')}
                onChange={v => setAttr(field.key, v)}
              />
            ))}
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

/* ── Helpers ── */

function inputCls(hasError: boolean): string {
  return `w-full border rounded-xl text-sm text-gray-700 px-3 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 transition-colors ${
    hasError
      ? 'border-rose-300 focus:ring-rose-500/20'
      : 'border-gray-200 focus:ring-teal-500/20'
  }`;
}

/* ── Field wrapper ── */
interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: JSX.Element;
}

function Field({ label, required, error, children }: FieldProps): JSX.Element {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
        {label}
        {required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-rose-500 mt-1.5">{error}</p>}
    </div>
  );
}

/* ── Dynamic attribute field ── */
interface AttrInputProps {
  field: AttributeField;
  value: AttrValue;
  onChange: (v: AttrValue) => void;
}

function AttrInput({ field, value, onChange }: AttrInputProps): JSX.Element {
  const str = Array.isArray(value) ? '' : (value as string);
  const arr = Array.isArray(value) ? (value as string[]) : [];

  function toggleChip(v: string): void {
    onChange(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  }

  const labelEl = (
    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
      {field.label}
      {field.required && <span className="text-rose-400 ml-0.5">*</span>}
      {field.unit && <span className="text-gray-400 font-normal ml-1">({field.unit})</span>}
    </label>
  );

  if (field.type === 'multiselect') {
    return (
      <div>
        {labelEl}
        <div className="flex flex-wrap gap-2">
          {field.options?.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleChip(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                arr.includes(opt.value)
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

  if (field.type === 'color') {
    return (
      <div>
        {labelEl}
        <div className="flex flex-wrap gap-2">
          {field.options?.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleChip(opt.value)}
              title={opt.label}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                arr.includes(opt.value)
                  ? 'border-teal-500 scale-110 shadow-md'
                  : 'border-gray-200 hover:scale-105'
              }`}
              style={{ backgroundColor: opt.hex ?? opt.value }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {labelEl}
      {field.type === 'textarea' ? (
        <textarea
          value={str}
          onChange={e => onChange(e.target.value)}
          rows={3}
          placeholder={field.unit ?? ''}
          className={`${inputCls(false)} resize-none`}
        />
      ) : field.type === 'select' ? (
        <div className="relative">
          <select
            value={str}
            onChange={e => onChange(e.target.value)}
            className={`w-full appearance-none ${inputCls(false)} pr-8`}
          >
            <option value="">Select…</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      ) : (
        <input
          type={field.type === 'number' ? 'number' : 'text'}
          value={str}
          onChange={e => onChange(e.target.value)}
          placeholder={field.unit ?? ''}
          className={inputCls(false)}
        />
      )}
    </div>
  );
}
