import { useEffect, useState, type JSX } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2, Package, Pencil, Plus, Trash2, Wand2 } from 'lucide-react';
import { getProductVariants, toggleVariant, deleteVariant, createVariant } from '../../../services/sellerService';
import { useToast } from '../../../hooks/useToast';
import { ApiError } from '../../../lib/axios';
import type { Product, ProductVariant, AttributeField } from '../../../types';
import VariantSheet from './VariantSheet';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

function resolveImage(url: string): string {
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

function getVariantAxes(
  schema: AttributeField[],
  attrs: Record<string, unknown>,
): Array<{ fieldKey: string; values: string[] }> {
  return schema
    .filter(f => f.type === 'select' || f.type === 'multiselect' || f.type === 'color')
    .map(f => {
      let values: string[];
      if (f.type === 'multiselect' || f.type === 'color') {
        const selected = attrs[f.key];
        values = Array.isArray(selected) && selected.length > 0
          ? selected.map(String)
          : (f.options?.map(o => o.value) ?? []);
      } else {
        values = f.options?.map(o => o.value) ?? [];
      }
      return { fieldKey: f.key, values: values.filter(Boolean) };
    })
    .filter(axis => axis.values.length > 0);
}

function cartesianProduct(
  axes: Array<{ fieldKey: string; values: string[] }>,
): Record<string, string>[] {
  if (axes.length === 0) return [];
  return axes.reduce<Record<string, string>[]>(
    (acc, axis) => acc.flatMap(prev => axis.values.map(val => ({ ...prev, [axis.fieldKey]: val }))),
    [{}],
  );
}

function isExistingCombination(
  combo: Record<string, string>,
  axisKeys: string[],
  existing: ProductVariant[],
): boolean {
  return existing.some(ev =>
    axisKeys.every(k => String(ev.attributes[k]) === combo[k]),
  );
}

export default function VariantList(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductVariant | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const data = await getProductVariants(id!);
        setProduct(data.product);
        setVariants(data.variants);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to load variants');
        navigate(`/products/${id}/edit`);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]); // toast and navigate are stable

  async function handleAutoGenerate(): Promise<void> {
    if (!product) return;
    const schema = product.category?.attributeSchema ?? [];
    const axes = getVariantAxes(schema, product.attributes ?? {});
    const allCombos = cartesianProduct(axes);
    const axisKeys = axes.map(a => a.fieldKey);
    const newCombos = allCombos.filter(c => !isExistingCombination(c, axisKeys, variants));

    if (newCombos.length === 0) {
      toast.info('All combinations already exist');
      return;
    }

    setAutoGenerating(true);
    try {
      const created: ProductVariant[] = [];
      for (const combo of newCombos) {
        const result = await createVariant(id!, {
          attributes: combo,
          images: product.images ?? [],
          sellingPrice: product.sellingPrice,
          ...(product.mrp != null ? { mrp: product.mrp } : {}),
          stock: 0,
        });
        created.push(result.variant);
      }
      setVariants(prev => [...prev, ...created]);
      toast.success(`Generated ${created.length} variant${created.length === 1 ? '' : 's'} — update stock for each`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to generate variants');
    } finally {
      setAutoGenerating(false);
    }
  }

  async function handleToggle(variant: ProductVariant): Promise<void> {
    try {
      const { variant: updated } = await toggleVariant(id!, variant.id);
      setVariants(prev => prev.map(v => v.id === updated.id ? updated : v));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update variant');
    }
  }

  function openAdd(): void {
    setEditingVariant(null);
    setSheetOpen(true);
  }

  function openEdit(variant: ProductVariant): void {
    setEditingVariant(variant);
    setSheetOpen(true);
  }

  function handleSheetClose(): void {
    setSheetOpen(false);
    setEditingVariant(null);
  }

  function handleSheetSaved(variant: ProductVariant): void {
    const isUpdate = variants.some(v => v.id === variant.id);
    setVariants(prev =>
      isUpdate
        ? prev.map(v => v.id === variant.id ? variant : v)
        : [...prev, variant],
    );
    toast.success(isUpdate ? 'Variant updated' : 'Variant added');
    setSheetOpen(false);
    setEditingVariant(null);
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteVariant(id!, deleteTarget.id);
      setVariants(prev => prev.filter(v => v.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success('Variant deleted');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete variant');
    } finally {
      setDeleting(false);
    }
  }

  const variantAxes = product
    ? getVariantAxes(product.category?.attributeSchema ?? [], product.attributes ?? {})
    : [];
  const newCombosCount = !loading && product
    ? cartesianProduct(variantAxes).filter(
        c => !isExistingCombination(c, variantAxes.map(a => a.fieldKey), variants),
      ).length
    : 0;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Teal header */}
      <div
        className="px-5 pt-8 pb-20"
        style={{
          background: 'linear-gradient(150deg, #26B8B2 0%, #1A9E98 45%, #14817C 100%)',
          borderRadius: '0 0 28px 28px',
        }}
      >
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/products/${id}/edit`)}
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-white text-[20px] font-bold leading-tight">Variants</h1>
              {product && (
                <p className="text-white/70 text-xs mt-0.5 truncate max-w-[180px]">{product.name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {newCombosCount > 0 && (
              <button
                type="button"
                onClick={() => void handleAutoGenerate()}
                disabled={autoGenerating}
                title={`Auto-generate ${newCombosCount} new combination${newCombosCount === 1 ? '' : 's'}`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 text-white text-sm font-semibold hover:bg-white/30 transition-colors disabled:opacity-60"
              >
                {autoGenerating
                  ? <Loader2 size={15} className="animate-spin" />
                  : <Wand2 size={15} />
                }
                <span className="hidden sm:inline">Auto-generate</span>
                <span className="text-white/70 text-xs">+{newCombosCount}</span>
              </button>
            )}
            <button
              type="button"
              onClick={openAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/20 text-white text-sm font-semibold hover:bg-white/30 transition-colors shrink-0"
            >
              <Plus size={15} />
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-12 relative z-10 max-w-2xl mx-auto pb-8">
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => <VariantCardSkeleton key={i} />)}
          </div>
        ) : variants.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : (
          <div className="flex flex-col gap-3">
            {variants.map(variant => (
              <VariantCard
                key={variant.id}
                variant={variant}
                schema={product?.category?.attributeSchema ?? []}
                onToggle={() => void handleToggle(variant)}
                onEdit={() => openEdit(variant)}
                onDelete={() => setDeleteTarget(variant)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit sheet */}
      {sheetOpen && product && (
        <VariantSheet
          key={editingVariant?.id ?? 'new'}
          productId={id!}
          product={product}
          variant={editingVariant}
          existingVariants={variants}
          onSaved={handleSheetSaved}
          onClose={handleSheetClose}
        />
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <DeleteModal
          loading={deleting}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

/* ── Variant card ── */
interface VariantCardProps {
  variant: ProductVariant;
  schema: AttributeField[];
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function VariantCard({ variant, schema, onToggle, onEdit, onDelete }: VariantCardProps): JSX.Element {
  const [imgError, setImgError] = useState(false);
  const imageUrl = variant.images[0] ? resolveImage(variant.images[0]) : null;
  const attrEntries = Object.entries(variant.attributes);
  const hasDiscount = variant.mrp != null && variant.mrp > variant.sellingPrice;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex gap-3">
        {/* Thumbnail */}
        <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
          {imageUrl && !imgError ? (
            <img
              src={imageUrl}
              alt="Variant"
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <Package size={20} className="text-gray-300" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pt-0.5">
          {/* Attribute pills */}
          <div className="flex flex-wrap gap-1.5">
            {attrEntries.map(([key, value]) => {
              const field = schema.find(f => f.key === key);
              if (field?.type === 'color') {
                const opt = field.options?.find(o => o.value === String(value));
                return (
                  <div key={key} className="flex items-center gap-1.5 bg-gray-100 rounded-full pl-1.5 pr-2.5 py-0.5">
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-white shadow-sm shrink-0"
                      style={{ backgroundColor: opt?.hex ?? String(value) }}
                    />
                    <span className="text-xs text-gray-600 font-medium">{opt?.label ?? String(value)}</span>
                  </div>
                );
              }
              const fieldLabel = field?.label ?? key;
              const displayVal = field?.options?.find(o => o.value === String(value))?.label ?? String(value);
              return (
                <span key={key} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full font-medium">
                  {fieldLabel}: {displayVal}
                </span>
              );
            })}
            {attrEntries.length === 0 && (
              <span className="text-xs text-gray-400 italic">No attributes</span>
            )}
            {!variant.isActive && (
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                Hidden
              </span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-sm font-bold text-teal-600">
              ₹{variant.sellingPrice.toLocaleString('en-IN')}
            </span>
            {hasDiscount && (
              <span className="text-xs text-gray-400 line-through">
                ₹{variant.mrp!.toLocaleString('en-IN')}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Stock: {variant.stock}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-50">
        <button
          type="button"
          onClick={onToggle}
          title={variant.isActive ? 'Hide variant' : 'Show variant'}
          className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 hover:bg-teal-100 transition-colors"
        >
          {variant.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        <button
          type="button"
          onClick={onEdit}
          title="Edit variant"
          className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 hover:bg-teal-100 transition-colors"
        >
          <Pencil size={15} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Delete variant"
          className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center text-rose-400 hover:bg-rose-100 transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

/* ── Skeleton ── */
function VariantCardSkeleton(): JSX.Element {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 animate-pulse">
      <div className="flex gap-3">
        <div className="w-16 h-16 rounded-xl bg-gray-100 shrink-0" />
        <div className="flex-1 pt-0.5">
          <div className="flex gap-1.5">
            <div className="h-5 w-16 bg-gray-100 rounded-full" />
            <div className="h-5 w-20 bg-gray-100 rounded-full" />
          </div>
          <div className="h-4 w-20 bg-gray-100 rounded mt-2" />
          <div className="h-3 w-16 bg-gray-100 rounded mt-1.5" />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-50">
        <div className="w-9 h-9 rounded-full bg-gray-100" />
        <div className="w-9 h-9 rounded-full bg-gray-100" />
        <div className="w-9 h-9 rounded-full bg-gray-100" />
      </div>
    </div>
  );
}

/* ── Empty state ── */
function EmptyState({ onAdd }: { onAdd: () => void }): JSX.Element {
  return (
    <div className="bg-white rounded-2xl shadow-sm py-14 text-center">
      <Package size={40} className="text-gray-200 mx-auto mb-3" />
      <p className="text-sm font-semibold text-gray-500">No variants yet</p>
      <p className="text-xs text-gray-400 mt-1 mb-4 px-8">
        Add variants to offer different sizes, colors, or other options
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="text-sm font-semibold text-teal-600 hover:text-teal-700"
      >
        + Add first variant
      </button>
    </div>
  );
}

/* ── Delete modal ── */
interface DeleteModalProps {
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteModal({ loading, onConfirm, onCancel }: DeleteModalProps): JSX.Element {
  return (
    <div className="fixed inset-0 md:left-60 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={20} className="text-rose-500" />
        </div>
        <h3 className="text-base font-bold text-gray-800 text-center mb-1">Delete Variant</h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          This variant will be permanently deleted.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-rose-500 text-sm font-semibold text-white hover:bg-rose-600 transition-colors disabled:opacity-60"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
