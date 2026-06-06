import { useEffect, useState, type JSX, type ChangeEvent } from 'react';
import { useFormik, type FormikHelpers } from 'formik';
import { X, Camera, Loader2 } from 'lucide-react';
import { uploadProductImage, createVariant, updateVariant } from '../../../services/sellerService';
import { variantFormSchema, type VariantFormValues } from '../../../validation/variantSchemas';
import { useToast } from '../../../hooks/useToast';
import { ApiError } from '../../../lib/axios';
import { resolveImage } from '../../../lib/imageUtils';
import { inputCls } from '../../../lib/classUtils';
import type { Product, ProductVariant, AttributeField, AttributeFieldOption } from '../../../types';

/**
 * Returns the options to show for a variant field.
 * For multiselect/color: filtered to what the product itself has selected.
 * For select: all category options.
 * For text/number/textarea: empty (use a free input).
 */
function getVariantOptions(
  field: AttributeField,
  productAttrs: Record<string, unknown>,
): AttributeFieldOption[] {
  if (!field.options?.length) return [];

  if (field.type === 'multiselect' || field.type === 'color') {
    const selected = productAttrs[field.key];
    if (Array.isArray(selected) && selected.length > 0) {
      const set = new Set(selected.map(String));
      const filtered = field.options.filter(o => set.has(o.value));
      if (filtered.length > 0) return filtered;
    }
    return field.options;
  }

  if (field.type === 'select') return field.options;

  return [];
}

/**
 * True when all option-based fields are filled AND adding `optValue` for `fieldKey`
 * would exactly match an existing variant's combination.
 */
function isOptionDuplicate(
  fieldKey: string,
  optValue: string,
  currentAttrs: Record<string, string>,
  fieldsWithOptions: AttributeField[],
  existingVariants: ProductVariant[],
  editingId: string | null,
): boolean {
  const tentative = { ...currentAttrs, [fieldKey]: optValue };
  const allFilled = fieldsWithOptions.every(f => tentative[f.key]);
  if (!allFilled) return false;
  return existingVariants.some(ev => {
    if (editingId && ev.id === editingId) return false;
    return fieldsWithOptions.every(f => String(ev.attributes[f.key]) === tentative[f.key]);
  });
}

/** True when the full current selection duplicates an existing variant. */
function hasDuplicateCombination(
  attrValues: Record<string, string>,
  fieldsWithOptions: AttributeField[],
  existingVariants: ProductVariant[],
  editingId: string | null,
): boolean {
  if (fieldsWithOptions.length === 0) return false;
  return existingVariants.some(ev => {
    if (editingId && ev.id === editingId) return false;
    return fieldsWithOptions.every(f => String(ev.attributes[f.key]) === attrValues[f.key]);
  });
}

/* ── Variant attribute field ── */
interface VAttrFieldProps {
  field: AttributeField;
  options: AttributeFieldOption[];
  value: string;
  onChange: (v: string) => void;
  isDisabled: (optVal: string) => boolean;
}

function VAttrField({ field, options, value, onChange, isDisabled }: VAttrFieldProps): JSX.Element {
  const labelEl = (
    <div className="mb-1.5">
      <span className="text-xs font-semibold text-gray-500">
        {field.label}
        <span className="text-rose-400 ml-0.5">*</span>
      </span>
      {(field.type === 'multiselect' || field.type === 'color') && options.length > 0 && (
        <span className="text-gray-400 text-xs ml-1.5">(select one)</span>
      )}
    </div>
  );

  if (field.type === 'color' && options.length > 0) {
    return (
      <div>
        {labelEl}
        <div className="flex flex-wrap gap-2">
          {options.map(opt => {
            const used = isDisabled(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => !used && onChange(value === opt.value ? '' : opt.value)}
                title={used ? 'Used in another variant' : opt.label}
                className={`w-9 h-9 rounded-full border-2 transition-all ${
                  used
                    ? 'opacity-35 cursor-not-allowed'
                    : value === opt.value
                      ? 'border-teal-500 scale-110 shadow-md ring-2 ring-teal-200'
                      : 'border-gray-200 hover:scale-105'
                }`}
                style={{ backgroundColor: opt.hex ?? opt.value }}
              />
            );
          })}
        </div>
        {value && (
          <p className="text-xs text-gray-400 mt-1.5">
            Selected: {options.find(o => o.value === value)?.label ?? value}
          </p>
        )}
      </div>
    );
  }

  if ((field.type === 'multiselect' || field.type === 'select') && options.length > 0) {
    return (
      <div>
        {labelEl}
        <div className="flex flex-wrap gap-2">
          {options.map(opt => {
            const used = isDisabled(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => !used && onChange(value === opt.value ? '' : opt.value)}
                title={used ? 'Used in another variant' : undefined}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  used
                    ? 'opacity-35 cursor-not-allowed bg-white border-gray-200 text-gray-400 line-through'
                    : value === opt.value
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

  // text / number / textarea — free input
  return (
    <div>
      {labelEl}
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={field.unit ? `e.g. ${field.unit}` : `Enter ${field.label}`}
        className="w-full border border-gray-200 rounded-xl text-sm text-gray-700 px-3 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
      />
    </div>
  );
}

/* ── Main sheet ── */
interface VariantSheetProps {
  productId: string;
  product: Product;
  variant: ProductVariant | null;
  existingVariants: ProductVariant[];
  onSaved: (variant: ProductVariant) => void;
  onClose: () => void;
}

export default function VariantSheet({
  productId,
  product,
  variant,
  existingVariants,
  onSaved,
  onClose,
}: VariantSheetProps): JSX.Element {
  const toast = useToast();
  const isEdit = variant !== null;

  const attributeSchema   = product.category?.attributeSchema ?? [];
  const productAttrs      = product.attributes ?? {};
  const variantAxisFields = attributeSchema.filter(
    f => f.type === 'select' || f.type === 'multiselect' || f.type === 'color',
  );
  const fieldsWithOptions = variantAxisFields.filter(f => getVariantOptions(f, productAttrs).length > 0);

  /* Slide-up animation */
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  /* One string value per schema field key */
  const [attrValues, setAttrValues] = useState<Record<string, string>>(() => {
    if (!isEdit) return {};
    const init: Record<string, string> = {};
    for (const [k, v] of Object.entries(variant.attributes)) {
      init[k] = String(v);
    }
    return init;
  });

  /* Images */
  const [images, setImages] = useState<string[]>(isEdit ? variant.images : []);
  const [isUploading, setIsUploading] = useState(false);

  const form = useFormik<VariantFormValues>({
    initialValues: {
      sellingPrice: isEdit ? String(variant.sellingPrice) : String(product.sellingPrice),
      mrp:          isEdit && variant.mrp != null ? String(variant.mrp) : product.mrp != null ? String(product.mrp) : '',
      stock:        isEdit ? String(variant.stock) : '0',
    },
    validationSchema: variantFormSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: handleSubmit,
  });

  function setAttr(key: string, value: string): void {
    setAttrValues(prev => ({ ...prev, [key]: value }));
  }

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
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

  async function handleSubmit(
    values: VariantFormValues,
    helpers: FormikHelpers<VariantFormValues>,
  ): Promise<void> {
    // All variant-axis fields that have options must have a selection
    const missingFields = variantAxisFields.filter(f => {
      const opts = getVariantOptions(f, productAttrs);
      return opts.length > 0 && !attrValues[f.key];
    });
    if (missingFields.length > 0) {
      toast.error(`Please select: ${missingFields.map(f => f.label).join(', ')}`);
      helpers.setSubmitting(false);
      return;
    }

    if (hasDuplicateCombination(attrValues, fieldsWithOptions, existingVariants, variant?.id ?? null)) {
      toast.error('This combination already exists. Change at least one attribute to make it unique.');
      helpers.setSubmitting(false);
      return;
    }

    if (images.length === 0) {
      toast.error('Upload at least one image for this variant');
      helpers.setSubmitting(false);
      return;
    }

    // Only include non-empty values in the submitted attributes
    const attributes: Record<string, string> = {};
    for (const [k, v] of Object.entries(attrValues)) {
      if (v.trim()) attributes[k] = v.trim();
    }

    const data = {
      attributes,
      images,
      sellingPrice: Number(values.sellingPrice),
      ...(values.mrp ? { mrp: Number(values.mrp) } : {}),
      stock: Number(values.stock),
    };

    try {
      const result = isEdit
        ? await updateVariant(productId, variant.id, data)
        : await createVariant(productId, data);
      onSaved(result.variant);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save variant');
    }
  }

  return (
    <div className="fixed inset-0 md:left-60 z-50 flex flex-col justify-end md:justify-center md:items-center md:p-6">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Sheet (mobile) / Dialog (desktop) */}
      <div
        className={`relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-lg max-h-[88vh] flex flex-col shadow-2xl transition-transform md:transition-none duration-300 ${
          visible ? 'translate-y-0' : 'translate-y-full md:translate-y-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-800">
              {isEdit ? 'Edit Variant' : 'Add Variant'}
            </h2>
            {product.category && (
              <p className="text-xs text-gray-400 mt-0.5">{product.category.name}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* Dynamic attribute fields */}
          {variantAxisFields.length > 0 ? (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Variant Attributes
              </p>
              {variantAxisFields.map(field => {
                const opts = getVariantOptions(field, productAttrs);
                return (
                  <VAttrField
                    key={field.key}
                    field={field}
                    options={opts}
                    value={attrValues[field.key] ?? ''}
                    onChange={v => setAttr(field.key, v)}
                    isDisabled={optVal => isOptionDuplicate(
                      field.key, optVal, attrValues,
                      fieldsWithOptions, existingVariants, variant?.id ?? null,
                    )}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3.5 text-center leading-relaxed">
              No option-type attributes for this category.
              Variants will be differentiated by price and stock only.
            </p>
          )}

          {/* Images */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Images<span className="text-rose-400 ml-0.5">*</span>
            </p>
            <div className="flex gap-2 flex-wrap">
              {images.map((url, i) => (
                <div key={url} className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  <img
                    src={resolveImage(url)}
                    alt={`Variant ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImages(prev => prev.filter(u => u !== url))}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    <X size={9} />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label
                  className={`w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-teal-400 transition-colors shrink-0 ${
                    isUploading ? 'pointer-events-none opacity-60' : ''
                  }`}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  {isUploading
                    ? <Loader2 size={16} className="text-teal-400 animate-spin" />
                    : <Camera size={18} className="text-gray-300" />
                  }
                </label>
              )}
            </div>
          </div>

          {/* Pricing & Stock */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Pricing & Stock
            </p>

            <div className="grid grid-cols-2 gap-3">
              <PriceField
                label="Selling Price"
                name="sellingPrice"
                value={form.values.sellingPrice}
                error={form.touched.sellingPrice ? form.errors.sellingPrice as string : undefined}
                onChange={form.handleChange}
                onBlur={form.handleBlur}
                hasError={!!form.touched.sellingPrice && !!form.errors.sellingPrice}
                required
              />
              <PriceField
                label="MRP"
                name="mrp"
                value={form.values.mrp}
                error={form.touched.mrp ? form.errors.mrp as string : undefined}
                onChange={form.handleChange}
                onBlur={form.handleBlur}
                hasError={!!form.touched.mrp && !!form.errors.mrp}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Stock<span className="text-rose-400 ml-0.5">*</span>
              </label>
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
              {form.touched.stock && form.errors.stock && (
                <p className="text-xs text-rose-500 mt-1.5">{form.errors.stock as string}</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={() => void form.submitForm()}
            disabled={form.isSubmitting}
            className="w-full py-3.5 rounded-2xl text-white text-sm font-bold disabled:opacity-60 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1B9E98 0%, #157A75 100%)' }}
          >
            {form.isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Variant'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Price input with ₹ prefix ── */
interface PriceFieldProps {
  label: string;
  name: string;
  value: string;
  error?: string;
  hasError: boolean;
  required?: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onBlur: React.FocusEventHandler<HTMLInputElement>;
}

function PriceField({ label, name, value, error, hasError, required, onChange, onBlur }: PriceFieldProps): JSX.Element {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">₹</span>
        <input
          name={name}
          type="number"
          min={0}
          step="0.01"
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder="0"
          className={`${inputCls(hasError)} pl-7`}
        />
      </div>
      {error && <p className="text-xs text-rose-500 mt-1.5">{error}</p>}
    </div>
  );
}
