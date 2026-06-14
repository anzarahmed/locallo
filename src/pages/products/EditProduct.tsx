import { useEffect, useState, type JSX, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFormik, type FormikHelpers } from 'formik';
import { ArrowLeft, Camera, X, Plus, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import {
  getProfile, getSellerProduct, updateProduct, uploadProductImage,
} from '../../services/sellerService';
import { addProductSchema, type AddProductFormValues } from '../../validation/productSchemas';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/axios';
import { resolveImage } from '../../lib/imageUtils';
import { normalizeAttrValues, type AttrValue } from '../../lib/attributeUtils';
import { inputCls } from '../../lib/classUtils';
import { MAX_SECONDARY_IMAGES } from '../../constants';
import FormField from '../../components/ui/FormField';
import AttrInput from '../../components/ui/AttrInput';
import type { SellerCategory, AttributeField } from '../../types';

const EMPTY_VALUES: AddProductFormValues = {
  name: '', description: '', categoryId: 0, sellingPrice: '', mrp: '', costPrice: '', stock: '',
};

export default function EditProduct(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [pageLoading, setPageLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [categories, setCategories] = useState<SellerCategory[]>([]);
  const [primaryImage, setPrimaryImage] = useState<string | null>(null);
  const [secondaryImages, setSecondaryImages] = useState<string[]>([]);
  const [isReplacingPrimary, setIsReplacingPrimary] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attributeSchema, setAttributeSchema] = useState<AttributeField[]>([]);
  const [attributes, setAttributes] = useState<Record<string, AttrValue>>({});
  const [initialValues, setInitialValues] = useState<AddProductFormValues>(EMPTY_VALUES);
  const [hasVariants, setHasVariants] = useState(false);
  const [variantCount, setVariantCount] = useState(0);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const [{ product }, profileData] = await Promise.all([
          getSellerProduct(id!),
          getProfile(),
        ]);
        setCategories(profileData.profile.categories);
        const allImages = product.images ?? [];
        setPrimaryImage(allImages[0] ?? null);
        setSecondaryImages(allImages.slice(1, 1 + MAX_SECONDARY_IMAGES));
        const count = product.variants?.length ?? 0;
        setHasVariants(count > 0);
        setVariantCount(count);
        const schema = product.category?.attributeSchema ?? [];
        setAttributeSchema(schema);
        setAttributes(normalizeAttrValues(product.attributes ?? {}, schema));
        setInitialValues({
          name:         product.name,
          description:  product.description ?? '',
          categoryId:   product.categoryId,
          sellingPrice: String(product.sellingPrice),
          mrp:          product.mrp      != null ? String(product.mrp)      : '',
          costPrice:    product.costPrice != null ? String(product.costPrice) : '',
          stock:        String(product.stock),
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          toast.error(err instanceof ApiError ? err.message : 'Failed to load product');
          navigate('/products');
        }
      } finally {
        setPageLoading(false);
      }
    }
    void load();
  }, [id]); // toast and navigate are stable

  const form = useFormik<AddProductFormValues>({
    initialValues,
    enableReinitialize: true,
    validationSchema: addProductSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: handleSubmit,
  });

  function applyCategory(catId: number): void {
    const cat = categories.find(c => c.id === catId);
    setAttributeSchema(cat?.attributeSchema ?? []);
    setAttributes({});
  }

  async function handlePrimaryReplace(file: File): Promise<void> {
    setIsReplacingPrimary(true);
    try {
      const { url } = await uploadProductImage(file);
      setPrimaryImage(url);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to upload image');
    } finally {
      setIsReplacingPrimary(false);
    }
  }

  function handlePrimaryChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    void handlePrimaryReplace(file);
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
      toast.error('A primary product image is required');
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
      await updateProduct(id!, {
        name:         values.name,
        description:  values.description,
        categoryId:   Number(values.categoryId),
        sellingPrice: Number(values.sellingPrice),
        mrp:          values.mrp      ? Number(values.mrp)      : undefined,
        costPrice:    values.costPrice ? Number(values.costPrice) : undefined,
        ...(hasVariants ? {} : { stock: Number(values.stock) }),
        images:       [primaryImage, ...secondaryImages],
        attributes,
      });
      toast.success('Product updated');
      navigate('/products');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update product';
      helpers.setStatus(msg);
      toast.error(msg);
    }
  }

  /* ── Not found ── */
  if (!pageLoading && notFound) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-gray-500 text-sm font-medium">Product not found</p>
        <button
          onClick={() => navigate('/products')}
          className="text-sm font-semibold text-teal-600 hover:text-teal-700"
        >
          ← Back to Products
        </button>
      </div>
    );
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
        <h1 className="text-white text-[20px] font-bold">Edit Product</h1>
      </div>

      {pageLoading ? (
        <FormSkeleton />
      ) : (
        <div className="px-4 pt-5 max-w-2xl mx-auto space-y-4">
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
                    onClick={() => setPrimaryImage(null)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    <X size={11} />
                  </button>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-2">Main display image for your product</p>
                  <label className={`inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 cursor-pointer hover:text-teal-700 ${isReplacingPrimary ? 'pointer-events-none opacity-50' : ''}`}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePrimaryChange}
                      className="hidden"
                    />
                    {isReplacingPrimary ? (
                      <><Loader2 size={12} className="animate-spin" /> Uploading…</>
                    ) : (
                      'Replace image'
                    )}
                  </label>
                </div>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-gray-200 py-10 cursor-pointer hover:border-teal-400 transition-colors ${isReplacingPrimary ? 'pointer-events-none opacity-70' : ''}`}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePrimaryChange}
                  className="hidden"
                />
                {isReplacingPrimary ? (
                  <>
                    <Loader2 size={32} className="text-teal-500 animate-spin" />
                    <p className="text-sm font-semibold text-gray-500">Uploading…</p>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center">
                      <Camera size={24} className="text-teal-500" />
                    </div>
                    <p className="text-sm font-semibold text-gray-600">Upload primary photo</p>
                  </>
                )}
              </label>
            )}
          </div>

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
                className={inputCls(!!form.touched.name && !!form.errors.name)}
              />
            </FormField>

            <FormField label="Description" required error={form.touched.description ? form.errors.description : undefined}>
              <textarea
                name="description"
                value={form.values.description}
                onChange={form.handleChange}
                onBlur={form.handleBlur}
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
                    const catId = Number(e.target.value);
                    void form.setFieldValue('categoryId', catId);
                    applyCategory(catId);
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
                    className={`${inputCls(!!form.touched.mrp && !!form.errors.mrp)} pl-7`}
                  />
                </div>
              </FormField>
            </div>

            <FormField label="Cost Price (optional)" error={form.touched.costPrice ? form.errors.costPrice as string : undefined}>
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
                  className={`${inputCls(!!form.touched.costPrice && !!form.errors.costPrice)} pl-7`}
                />
              </div>
            </FormField>
          </div>

          {/* Inventory */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-sm font-semibold text-gray-700 mb-4">Inventory</p>
            <FormField
              label="Stock Quantity"
              required={!hasVariants}
              error={!hasVariants && form.touched.stock ? form.errors.stock as string : undefined}
            >
              {hasVariants ? (
                <div className="w-full border border-gray-200 rounded-xl text-sm px-3 py-2.5 bg-gray-50 flex items-center justify-between">
                  <span className="font-semibold text-gray-700">{form.values.stock}</span>
                  <span className="text-xs text-gray-400">Sum of variants</span>
                </div>
              ) : (
                <input
                  name="stock"
                  type="number"
                  min={0}
                  step="1"
                  value={form.values.stock}
                  onChange={form.handleChange}
                  onBlur={form.handleBlur}
                  className={inputCls(!!form.touched.stock && !!form.errors.stock)}
                />
              )}
            </FormField>
          </div>

          {/* Product Attributes — free-form descriptors (text / number / textarea) */}
          {attributeSchema.some(f => f.type === 'text' || f.type === 'number' || f.type === 'textarea') && (
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
              <p className="text-sm font-semibold text-gray-700">Product Attributes</p>
              {attributeSchema
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

          {/* Available Options — select / multiselect / color define which variants exist */}
          {attributeSchema.some(f => f.type === 'select' || f.type === 'multiselect' || f.type === 'color') && (
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-700">Available Options</p>
                <p className="text-xs text-gray-400 mt-0.5">Select all options this product is available in — e.g. all colors and sizes</p>
              </div>
              {attributeSchema
                .filter(f => f.type === 'select' || f.type === 'multiselect' || f.type === 'color')
                .map(field => (
                  <AttrInput
                    key={field.key}
                    field={field}
                    value={attributes[field.key] ?? (field.type === 'multiselect' || field.type === 'color' ? [] : '')}
                    onChange={v => setAttr(field.key, v)}
                  />
                ))}
            </div>
          )}

          {/* Variants */}
          <button
            type="button"
            onClick={() => navigate(`/products/${id}/variants`)}
            className="w-full bg-white rounded-2xl shadow-sm px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
          >
            <div>
              <p className="text-sm font-semibold text-gray-700">Variants</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {variantCount > 0
                  ? `${variantCount} variant${variantCount === 1 ? '' : 's'} · tap to manage`
                  : 'Add size, color & other options with separate stock'}
              </p>
            </div>
            <ChevronRight size={18} className="text-gray-400 shrink-0" />
          </button>

          {form.status && (
            <p className="text-sm text-rose-500 text-center px-2">{form.status as string}</p>
          )}
        </div>
      )}

      {/* Sticky submit */}
      <div className="fixed bottom-0 left-0 right-0 md:left-60 bg-white border-t border-gray-100 px-4 py-3 z-20">
        <div className="max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => void form.submitForm()}
            disabled={form.isSubmitting || pageLoading}
            className="w-full py-3.5 rounded-2xl text-white text-sm font-bold disabled:opacity-60 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1B9E98 0%, #157A75 100%)' }}
          >
            {form.isSubmitting ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Loading skeleton ── */
function FormSkeleton(): JSX.Element {
  return (
    <div className="px-4 pt-5 max-w-2xl mx-auto space-y-4 animate-pulse">
      {/* Primary Image */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="h-4 w-28 bg-gray-100 rounded mb-3" />
        <div className="flex items-center gap-3">
          <div className="w-24 h-24 rounded-xl bg-gray-100" />
          <div className="space-y-2">
            <div className="h-3 w-40 bg-gray-100 rounded" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
      {/* Secondary Images */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="h-4 w-36 bg-gray-100 rounded mb-3" />
        <div className="flex gap-2">
          <div className="w-20 h-20 rounded-xl bg-gray-100" />
          <div className="w-20 h-20 rounded-xl bg-gray-100 border-2 border-dashed border-gray-200" />
        </div>
      </div>
      {/* Basic info */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
        <div className="h-4 w-20 bg-gray-100 rounded" />
        <div className="space-y-1.5">
          <div className="h-3 w-24 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-24 bg-gray-100 rounded" />
          <div className="h-24 bg-gray-100 rounded-xl" />
        </div>
      </div>
      {/* Category & Pricing */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
        <div className="h-4 w-36 bg-gray-100 rounded" />
        <div className="h-10 bg-gray-100 rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-10 bg-gray-100 rounded-xl" />
          <div className="h-10 bg-gray-100 rounded-xl" />
        </div>
        <div className="h-10 bg-gray-100 rounded-xl" />
      </div>
      {/* Inventory */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
        <div className="h-4 w-20 bg-gray-100 rounded" />
        <div className="h-10 bg-gray-100 rounded-xl" />
      </div>
    </div>
  );
}
