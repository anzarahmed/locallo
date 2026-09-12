import { useEffect, useState, type JSX, type ChangeEvent } from 'react';
import { useFormik, type FormikHelpers } from 'formik';
import { X, ImagePlus, Loader2, Lock } from 'lucide-react';
import { uploadProductImage, createBatchVariants, updateVariant } from '../../../services/sellerService';
import { MAX_SECONDARY_IMAGES } from '../../../constants';
import { variantFormSchema, type VariantFormValues } from '../../../validation/variantSchemas';
import { useToast } from '../../../hooks/useToast';
import { ApiError } from '../../../lib/axios';
import { resolveImage, validateImageFile } from '../../../lib/imageUtils';
import { inputCls } from '../../../lib/classUtils';
import {
  generateCombinations, getCombinationKey, hasStockDependentAttr, type VariantSelections,
} from '../../../lib/variantUtils';
import type { Product, ProductVariant, AttributeField, AttributeFieldOption } from '../../../types';

/* ── Main sheet ── */
interface VariantSheetProps {
  productId: string;
  product: Product;
  variant: ProductVariant | null;
  existingVariants: ProductVariant[];
  lockedAttributes?: Record<string, string>;
  onSaved: (variant: ProductVariant) => void;
  onClose: () => void;
}

function isVariantFieldEmpty(field: AttributeField, value: string | string[] | undefined): boolean {
  return field.type === 'multiselect' ? !Array.isArray(value) || value.length === 0 : !value;
}

export default function VariantSheet({
  productId,
  product,
  variant,
  existingVariants,
  lockedAttributes,
  onSaved,
  onClose,
}: VariantSheetProps): JSX.Element {
  const toast = useToast();
  const isEdit = variant !== null;

  const attributeSchema = product.category?.attributeSchema ?? [];
  const variantFields   = attributeSchema.filter(f => f.isVariant === true);
  const stockDependent  = hasStockDependentAttr(variantFields);
  const lockedFields    = variantFields.filter(f => lockedAttributes && f.key in lockedAttributes);
  const openFields      = variantFields.filter(f => !(lockedAttributes && f.key in lockedAttributes));

  /* Slide-up animation */
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const sdField = variantFields.find(f => f.isStockDependent === true);

  /* Set of combination keys that already exist — used to filter out duplicates */
  const existingComboKeys = new Set(
    existingVariants.map(ev => getCombinationKey(ev.attributes as Record<string, string>)),
  );

  /* Add-mode state */
  const [variantSelections, setVariantSelections] = useState<VariantSelections>(
    () => lockedAttributes ? { ...lockedAttributes } : {},
  );
  const [comboStocks, setComboStocks] = useState<Record<string, string>>({});
  const allCombinations = isEdit ? [] : generateCombinations(variantFields, variantSelections);
  const combinations    = allCombinations.filter(c => !existingComboKeys.has(getCombinationKey(c)));

  /* Images */
  const [images, setImages] = useState<string[]>(isEdit ? variant.images : []);
  const [isUploading, setIsUploading] = useState(false);

  /* Add mode: show "<Field> is required" once the user has tried to submit without selecting */
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  /* Edit mode: price/stock form */
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

  /*
   * Compute which option values to gray-out for a given variant field:
   *
   * Non-SD field (color):
   *   - If no SD field exists → block when any variant uses that color (nothing else to add)
   *   - If SD field exists   → block only when ALL SD options are already taken for that color
   *
   * SD field (sizes):
   *   - Block values where (currently selected non-SD attrs + this value) already exists
   */
  function usedValuesForField(field: AttributeField): Set<string> {
    if (!field.isStockDependent) {
      if (!sdField?.options?.length) {
        return new Set(
          existingVariants
            .map(ev => String((ev.attributes as Record<string, string>)[field.key] ?? ''))
            .filter(Boolean),
        );
      }
      return new Set(
        (field.options ?? [])
          .filter(opt =>
            sdField.options!.every(sizeOpt =>
              existingVariants.some(ev =>
                String((ev.attributes as Record<string, string>)[field.key]) === opt.value &&
                String((ev.attributes as Record<string, string>)[sdField.key]) === sizeOpt.value,
              ),
            ),
          )
          .map(opt => opt.value),
      );
    }

    // SD field: block sizes where the current non-SD selection + size already exists
    const nonSdSelections = variantFields
      .filter(f => f.isVariant && !f.isStockDependent)
      .reduce<Record<string, string>>((acc, f) => {
        const sel = variantSelections[f.key];
        if (typeof sel === 'string' && sel) acc[f.key] = sel;
        return acc;
      }, {});

    if (Object.keys(nonSdSelections).length === 0) return new Set<string>();

    return new Set(
      existingVariants
        .filter(ev =>
          Object.entries(nonSdSelections).every(
            ([k, v]) => String((ev.attributes as Record<string, string>)[k]) === v,
          ),
        )
        .map(ev => String((ev.attributes as Record<string, string>)[field.key])),
    );
  }

  function setVariantSelection(key: string, value: string | string[]): void {
    setVariantSelections(prev => ({ ...prev, [key]: value }));
    setComboStocks({});
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    const slots = MAX_SECONDARY_IMAGES - images.length;
    const toUpload = files.slice(0, slots);
    toUpload.forEach(file => {
      const invalid = validateImageFile(file);
      if (invalid) {
        toast.error(`${file.name}: ${invalid}`);
        return;
      }
      setIsUploading(true);
      uploadProductImage(file)
        .then(({ url }) => setImages(prev => [...prev, url]))
        .catch(err => toast.error(err instanceof ApiError ? err.message : 'Failed to upload image'))
        .finally(() => setIsUploading(false));
    });
  }

  async function handleSubmit(
    values: VariantFormValues,
    helpers: FormikHelpers<VariantFormValues>,
  ): Promise<void> {
    if (isEdit) {
      /* Edit mode: update price, stock, images for single variant */
      try {
        const result = await updateVariant(productId, variant.id, {
          images:       images.length > 0 ? images : (product.images ?? []),
          sellingPrice: Number(values.sellingPrice),
          ...(values.mrp ? { mrp: Number(values.mrp) } : {}),
          stock:        Number(values.stock),
        });
        onSaved(result.variant);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to save variant');
      }
      return;
    }

    /* Add mode: create one variant per combination */
    if (openFields.length > 0) {
      const missingFields = openFields.filter(f => isVariantFieldEmpty(f, variantSelections[f.key]));
      if (missingFields.length === openFields.length) {
        setAttemptedSubmit(true);
        toast.error('Select at least one option to create a variant');
        helpers.setSubmitting(false);
        return;
      }
      if (missingFields.length > 0) {
        setAttemptedSubmit(true);
        toast.error(
          missingFields.length === 1
            ? `${missingFields[0]!.label} is required`
            : `${missingFields.map(f => f.label).join(', ')} are required`,
        );
        helpers.setSubmitting(false);
        return;
      }
    } else if (allCombinations.length === 0) {
      setAttemptedSubmit(true);
      toast.error('Select at least one option to create a variant');
      helpers.setSubmitting(false);
      return;
    }
    if (combinations.length === 0) {
      toast.error('All selected combinations already exist');
      helpers.setSubmitting(false);
      return;
    }

    const sellingPrice = Number(values.sellingPrice);
    const mrp = values.mrp ? Number(values.mrp) : undefined;
    const variantImages = images.length > 0 ? images : (product.images ?? []);

    try {
      const sdFieldKeys = new Set(variantFields.filter(f => f.isStockDependent).map(f => f.key));
      const hasSdFields = sdFieldKeys.size > 0;

      // Shared non-SD variant attrs (e.g. colors: "white") — sent once, not repeated per row
      const sharedAttrs: Record<string, string> = {};
      if (hasSdFields) {
        for (const field of variantFields) {
          if (field.isStockDependent) continue;
          const sel = variantSelections[field.key];
          if (typeof sel === 'string' && sel) sharedAttrs[field.key] = sel;
        }
      }

      const rows = combinations.map(combo => ({
        attributes: hasSdFields
          ? Object.fromEntries(Object.entries(combo).filter(([k]) => sdFieldKeys.has(k)))
          : { ...combo },
        stock: stockDependent ? Number(comboStocks[getCombinationKey(combo)] ?? 0) : Number(values.stock),
      }));
      const result = await createBatchVariants(productId, {
        ...(hasSdFields && Object.keys(sharedAttrs).length > 0 && { attributes: sharedAttrs }),
        images:       variantImages,
        sellingPrice,
        ...(mrp !== undefined ? { mrp } : {}),
        rows,
      });
      onSaved(result.variants[0]!);
      toast.success(`Created ${result.variants.length} variant${result.variants.length === 1 ? '' : 's'}`);
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

      {/* Sheet */}
      <div
        className={`relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-lg max-h-[88vh] flex flex-col shadow-2xl transition-transform md:transition-none duration-300 ${
          visible ? 'translate-y-0' : 'translate-y-full md:translate-y-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-800">
              {isEdit ? 'Edit Variant' : lockedAttributes ? 'Add to Group' : 'Add Variant'}
            </h2>
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

          {/* Variant of */}
          <div className="rounded-2xl px-4 py-3 bg-teal-50/70 border border-teal-100">
            <p className="text-[11px] font-bold text-teal-700 uppercase tracking-wide mb-1">Variant of</p>
            <p className="text-sm font-bold text-gray-800">{product.name}</p>
            {product.category && (
              <p className="text-xs text-gray-400 mt-0.5">{product.category.name}</p>
            )}
          </div>

          {isEdit ? (
            /* ── Edit mode: show read-only attribute pills ── */
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Variant Details
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(variant.attributes).map(([key, val]) => {
                  const field = attributeSchema.find(f => f.key === key);
                  const opt = field?.options?.find(o => o.value === String(val));
                  return (
                    <span key={key} className="text-xs bg-teal-50 text-teal-700 px-3 py-1.5 rounded-full border border-teal-100">
                      <span className="font-bold">{field?.label ?? key}:</span>{' '}
                      <span className="text-gray-700 font-medium">{opt?.label ?? String(val)}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            lockedFields.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Group
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {lockedFields.map(field => {
                    const val = lockedAttributes![field.key];
                    const opt = field.options?.find(o => o.value === val);
                    return (
                      <span key={field.key} className="text-xs bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded-full font-medium">
                        {field.label}: {opt?.label ?? val}
                      </span>
                    );
                  })}
                </div>
              </div>
            )
          )}

          {/* Images */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {isEdit ? 'Variant' : 'Product'} Images (up to {MAX_SECONDARY_IMAGES})
            </p>

            <div className="flex gap-2 flex-wrap">
              {images.map((url, i) => (
                <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
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
              {images.length < MAX_SECONDARY_IMAGES && (
                <label className={`w-20 h-20 rounded-xl border-2 border-dashed border-teal-200 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-teal-400 transition-colors shrink-0 ${isUploading ? 'pointer-events-none opacity-60' : ''}`}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  {isUploading ? (
                    <Loader2 size={18} className="text-teal-400 animate-spin" />
                  ) : (
                    <>
                      <ImagePlus size={18} className="text-teal-500" />
                      <span className="text-[10px] font-semibold text-teal-600">Add Image</span>
                    </>
                  )}
                </label>
              )}
            </div>
          </div>

          {/* Pricing */}
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
              readOnly
              required={!isEdit}
            />
          </div>

          {/* Stock — edit mode always; add mode only when not derived from a combination matrix */}
          {(isEdit || !stockDependent) && (
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
          )}

          {!isEdit && (
            <>
              {/* Category (fixed — inherited from the parent product) */}
              {product.category && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Category
                  </p>
                  <div className="flex items-center gap-2 rounded-xl border border-teal-100 bg-teal-50/50 px-3.5 py-2.5">
                    <Lock size={14} className="text-teal-600 shrink-0" />
                    <span className="text-sm font-medium text-teal-700">{product.category.name}</span>
                  </div>
                </div>
              )}

              {/* Variant option selectors */}
              {variantFields.length > 0 ? (
                <div className="space-y-4">
                  {openFields.map(field => (
                    <SheetVariantOptionField
                      key={field.key}
                      field={field}
                      value={variantSelections[field.key]}
                      usedValues={usedValuesForField(field)}
                      onChange={v => setVariantSelection(field.key, v)}
                      showError={attemptedSubmit}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3.5 text-center leading-relaxed">
                  No variant attributes configured for this category.
                </p>
              )}

              {/* Combination stock matrix */}
              {stockDependent && combinations.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Stock Quantities
                  </p>
                  <div className="space-y-2">
                    {combinations.map(combo => {
                      const key = getCombinationKey(combo);
                      return (
                        <SheetStockRow
                          key={key}
                          combo={combo}
                          variantFields={variantFields}
                          stock={comboStocks[key] ?? '0'}
                          onChange={v => setComboStocks(prev => ({ ...prev, [key]: v }))}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
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
            {form.isSubmitting
              ? 'Saving…'
              : isEdit
                ? 'Save Changes'
                : combinations.length > 1
                  ? `Add ${combinations.length} Variants`
                  : 'Add Variant'
            }
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Option field used inside the sheet (add mode) ── */
interface SheetVariantOptionFieldProps {
  field: AttributeField;
  value: string | string[] | undefined;
  usedValues: Set<string>;
  onChange: (v: string | string[]) => void;
  showError: boolean;
}

function SheetVariantOptionField({ field, value, usedValues, onChange, showError }: SheetVariantOptionFieldProps): JSX.Element {
  const hasError = showError && isVariantFieldEmpty(field, value);

  const labelEl = (
    <div className="mb-1.5">
      <span className="text-xs font-semibold text-gray-500">
        {field.label}
        <span className="text-rose-400 ml-0.5">*</span>
      </span>
      {field.type === 'multiselect' && (
        <span className="text-gray-400 text-xs ml-1.5">(select all that apply)</span>
      )}
    </div>
  );

  const errorEl = hasError && (
    <p className="text-xs text-rose-500 mt-1.5">{field.label} is required</p>
  );

  if (field.type === 'multiselect' && field.options && field.options.length > 0) {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div>
        {labelEl}
        <div className="flex flex-wrap gap-2">
          {field.options.map((opt: AttributeFieldOption) => {
            const used   = usedValues.has(opt.value);
            const active = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => !used && onChange(active ? selected.filter(v => v !== opt.value) : [...selected, opt.value])}
                disabled={used}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  used
                    ? 'opacity-35 cursor-not-allowed border-gray-200 text-gray-400'
                    : active
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : hasError
                        ? 'bg-white border-rose-300 text-gray-600 hover:border-teal-400'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-teal-400'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {errorEl}
      </div>
    );
  }

  if ((field.type === 'select' || field.type === 'color') && field.options && field.options.length > 0) {
    const selected = typeof value === 'string' ? value : '';
    return (
      <div>
        {labelEl}
        <div className="flex flex-wrap gap-2">
          {field.options.map((opt: AttributeFieldOption) => {
            const used = usedValues.has(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => !used && onChange(selected === opt.value ? '' : opt.value)}
                disabled={used}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  used
                    ? 'opacity-35 cursor-not-allowed border-gray-200 text-gray-400'
                    : selected === opt.value
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : hasError
                        ? 'bg-white border-rose-300 text-gray-600 hover:border-teal-400'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-teal-400'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {errorEl}
      </div>
    );
  }

  const strVal = typeof value === 'string' ? value : '';
  return (
    <div>
      {labelEl}
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        value={strVal}
        onChange={e => onChange(e.target.value)}
        placeholder={field.unit ? `e.g. ${field.unit}` : `Enter ${field.label}`}
        className={`w-full border rounded-xl text-sm text-gray-700 px-3 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${
          hasError ? 'border-rose-300' : 'border-gray-200'
        }`}
      />
      {errorEl}
    </div>
  );
}

/* ── Stock row per combination (inside sheet) ── */
interface SheetStockRowProps {
  combo: Record<string, string>;
  variantFields: AttributeField[];
  stock: string;
  onChange: (v: string) => void;
}

function SheetStockRow({ combo, variantFields, stock, onChange }: SheetStockRowProps): JSX.Element {
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

/* ── Price input with ₹ prefix ── */
interface PriceFieldProps {
  label: string;
  name: string;
  value: string;
  error?: string;
  hasError: boolean;
  required?: boolean;
  readOnly?: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onBlur: React.FocusEventHandler<HTMLInputElement>;
}

function PriceField({ label, name, value, error, hasError, required, readOnly, onChange, onBlur }: PriceFieldProps): JSX.Element {
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
          readOnly={readOnly}
          className={`${inputCls(hasError)} pl-7${readOnly ? ' bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
        />
      </div>
      {error && <p className="text-xs text-rose-500 mt-1.5">{error}</p>}
    </div>
  );
}
