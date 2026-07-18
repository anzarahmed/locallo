import { useEffect, useState, type JSX, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, Eye, EyeOff, Loader2, Package, Pencil, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import {
  getProductVariants, toggleVariant, deleteVariant, markVariantSold, updateVariant,
  uploadProductImage,
} from '../../../services/sellerService';
import { MAX_SECONDARY_IMAGES } from '../../../constants';
import { useToast } from '../../../hooks/useToast';
import { ApiError } from '../../../lib/axios';
import { resolveImage } from '../../../lib/imageUtils';
import { hasDiscount } from '../../../lib/formatters';
import ConfirmDeleteModal from '../../../components/ui/ConfirmDeleteModal';
import SellModal from '../../../components/ui/SellModal';
import type { Product, ProductVariant, AttributeField } from '../../../types';
import VariantSheet from './VariantSheet';

interface VariantGroup {
  key: string;
  nonSdAttrs: Record<string, string>;
  variants: ProductVariant[];
}

function groupVariants(variants: ProductVariant[], sdKey: string): VariantGroup[] {
  const map = new Map<string, VariantGroup>();
  for (const v of variants) {
    const entries = Object.entries(v.attributes as Record<string, string>)
      .filter(([k]) => k !== sdKey)
      .sort(([a], [b]) => a.localeCompare(b));
    const key = entries.map(([k, val]) => `${k}:${val}`).join('|') || '__all__';
    if (!map.has(key)) {
      map.set(key, { key, nonSdAttrs: Object.fromEntries(entries), variants: [] });
    }
    map.get(key)!.variants.push(v);
  }
  return Array.from(map.values());
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
  const [editingGroup, setEditingGroup] = useState<VariantGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductVariant | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sellVariant, setSellVariant] = useState<ProductVariant | null>(null);
  const [selling, setSelling] = useState(false);

  const schema = product?.category?.attributeSchema ?? [];
  const sdField = schema.find(f => f.isVariant === true && f.isStockDependent === true);
  const groups = sdField ? groupVariants(variants, sdField.key) : null;

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

  async function handleSheetSaved(variant: ProductVariant): Promise<void> {
    const isUpdate = variants.some(v => v.id === variant.id);
    if (isUpdate) {
      setVariants(prev => prev.map(v => v.id === variant.id ? variant : v));
      toast.success('Variant updated');
    } else {
      try {
        const data = await getProductVariants(id!);
        setVariants(data.variants);
      } catch {
        setVariants(prev => [...prev, variant]);
      }
    }
    setSheetOpen(false);
    setEditingVariant(null);
  }

  function handleGroupSaved(updated: ProductVariant[]): void {
    setVariants(prev => prev.map(v => updated.find(u => u.id === v.id) ?? v));
    setEditingGroup(null);
    toast.success('Variants updated');
  }

  async function handleSell(quantity: number): Promise<void> {
    if (!sellVariant) return;
    setSelling(true);
    try {
      await markVariantSold(id!, sellVariant.id, quantity);
      const newVariants = variants.map(v =>
        v.id === sellVariant.id ? { ...v, stock: v.stock - quantity } : v,
      );
      setVariants(newVariants);
      const newProductStock = newVariants.reduce((sum, v) => sum + v.stock, 0);
      setProduct(prev => prev ? { ...prev, stock: newProductStock } : prev);
      toast.success(`Marked ${quantity} unit${quantity !== 1 ? 's' : ''} as sold`);
      setSellVariant(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to record sale');
    } finally {
      setSelling(false);
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Teal header */}
      <div
        className="px-6 md:px-8 pt-8 pb-16"
        style={{
          background: 'linear-gradient(150deg, #26B8B2 0%, #1A9E98 45%, #14817C 100%)',
          borderRadius: '0 0 28px 28px',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/products/${id}/edit`)}
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-white text-2xl font-bold leading-tight">Variants</h1>
              {product && (
                <p className="text-white/70 text-sm mt-0.5 truncate max-w-xs">{product.name}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/20 text-white text-sm font-semibold hover:bg-white/30 transition-colors shrink-0"
          >
            <Plus size={15} />
            Add Variant
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 md:px-8 -mt-8 relative z-10 pb-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <VariantCardSkeleton key={i} />)}
          </div>
        ) : variants.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : groups ? (
          <div className="space-y-3">
            {groups.map(group => (
              <GroupedVariantCard
                key={group.key}
                group={group}
                schema={schema}
                sdField={sdField!}
                onToggle={v => void handleToggle(v)}
                onEdit={v => openEdit(v)}
                onEditGroup={g => setEditingGroup(g)}
                onDelete={v => setDeleteTarget(v)}
                onSell={v => setSellVariant(v)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {variants.map(variant => (
              <VariantCard
                key={variant.id}
                variant={variant}
                schema={schema}
                onToggle={() => void handleToggle(variant)}
                onEdit={() => openEdit(variant)}
                onDelete={() => setDeleteTarget(variant)}
                onSell={() => setSellVariant(variant)}
              />
            ))}
          </div>
        )}
      </div>

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

      {editingGroup && product && sdField && (
        <GroupEditSheet
          key={editingGroup.key}
          productId={id!}
          product={product}
          group={editingGroup}
          sdField={sdField}
          schema={schema}
          onSaved={handleGroupSaved}
          onClose={() => setEditingGroup(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          title="Delete Variant"
          message="This variant will be permanently deleted."
          loading={deleting}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {sellVariant && (
        <SellModal
          itemName={Object.values(sellVariant.attributes).join(' / ') || 'Variant'}
          currentStock={sellVariant.stock}
          loading={selling}
          onConfirm={(qty) => void handleSell(qty)}
          onClose={() => setSellVariant(null)}
        />
      )}
    </div>
  );
}

/* ── Grouped variant card ── */
interface GroupedVariantCardProps {
  group: VariantGroup;
  schema: AttributeField[];
  sdField: AttributeField;
  onToggle: (v: ProductVariant) => void;
  onEdit: (v: ProductVariant) => void;
  onEditGroup: (g: VariantGroup) => void;
  onDelete: (v: ProductVariant) => void;
  onSell: (v: ProductVariant) => void;
}

function GroupedVariantCard({
  group, schema, sdField, onToggle, onEdit, onEditGroup, onDelete, onSell,
}: GroupedVariantCardProps): JSX.Element {
  const firstVariant = group.variants[0];
  const imageUrl = firstVariant.images[0] ? resolveImage(firstVariant.images[0]) : null;
  const [imgError, setImgError] = useState(false);

  useEffect(() => { setImgError(false); }, [imageUrl]);

  const nonSdEntries = Object.entries(group.nonSdAttrs);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      {/* Header: image + non-SD attributes (e.g. color) + edit button */}
      <div className="flex gap-3 mb-3">
        <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
          {imageUrl && !imgError ? (
            <img
              src={imageUrl}
              alt="Variant"
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <Package size={16} className="text-gray-300" />
          )}
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          {nonSdEntries.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {nonSdEntries.map(([key, val]) => {
                const field = schema.find(f => f.key === key);
                const opt = field?.options?.find(o => o.value === val);
                return (
                  <span key={key} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full font-medium">
                    {field?.label ?? key}: {opt?.label ?? val}
                  </span>
                );
              })}
            </div>
          ) : (
            <span className="text-xs text-gray-500 font-medium">All variants</span>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {group.variants.length} {sdField.label.toLowerCase()} option{group.variants.length !== 1 ? 's' : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onEditGroup(group)}
          className="shrink-0 flex items-center gap-1.5 px-3 h-8 rounded-xl bg-teal-50 text-teal-600 text-xs font-semibold hover:bg-teal-100 transition-colors self-start"
        >
          <Pencil size={11} />
          Edit
        </button>
      </div>

      {/* SD attribute rows (e.g. S / M / L) */}
      <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-hidden">
        {group.variants.map(v => {
          const sdValue = String((v.attributes as Record<string, string>)[sdField.key] ?? '');
          const sdOpt = sdField.options?.find(o => o.value === sdValue);
          const sdLabel = sdOpt?.label ?? sdValue;

          return (
            <div key={v.id} className="flex items-center gap-2 px-3 py-2.5">
              <span className="text-xs font-semibold text-gray-700 min-w-[40px] shrink-0">{sdLabel}</span>

              <span className="text-xs font-bold text-teal-600">
                ₹{v.sellingPrice.toLocaleString('en-IN')}
              </span>

              <span className={`text-xs ml-auto ${
                v.stock === 0 ? 'text-rose-400 font-medium' :
                v.stock <= 5 ? 'text-amber-500 font-medium' :
                'text-gray-400'
              }`}>
                {v.stock === 0 ? 'Out of stock' : `${v.stock} in stock`}
              </span>

              {!v.isActive && (
                <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">
                  Hidden
                </span>
              )}

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onSell(v)}
                  disabled={v.stock === 0}
                  title={v.stock === 0 ? 'Out of stock' : 'Mark as sold'}
                  className="w-7 h-7 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 hover:bg-teal-100 transition-colors disabled:opacity-40"
                >
                  <ShoppingBag size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => onToggle(v)}
                  title={v.isActive ? 'Hide variant' : 'Show variant'}
                  className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  {v.isActive ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(v)}
                  title="Edit variant"
                  className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(v)}
                  title="Delete variant"
                  className="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center text-rose-400 hover:bg-rose-100 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Group edit sheet — edit price/stock for all variants in a group at once ── */
interface GroupEditSheetProps {
  productId: string;
  product: Product;
  group: VariantGroup;
  sdField: AttributeField;
  schema: AttributeField[];
  onSaved: (variants: ProductVariant[]) => void;
  onClose: () => void;
}

function GroupEditSheet({
  productId, product, group, sdField, schema, onSaved, onClose,
}: GroupEditSheetProps): JSX.Element {
  const toast = useToast();

  const [rows, setRows] = useState(
    group.variants.map(v => ({
      id: v.id,
      sellingPrice: String(v.sellingPrice),
      mrp: v.mrp != null ? String(v.mrp) : '',
      stock: String(v.stock),
    })),
  );
  const [groupImages, setGroupImages] = useState<string[]>([...group.variants[0].images]);
  const [isUploading, setIsUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  function updateRow(i: number, field: 'sellingPrice' | 'mrp' | 'stock', val: string): void {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    const slots = MAX_SECONDARY_IMAGES - groupImages.length;
    const toUpload = files.slice(0, slots);
    setIsUploading(true);
    Promise.all(toUpload.map(file => uploadProductImage(file).then(({ url }) => url)))
      .then(urls => setGroupImages(prev => [...prev, ...urls]))
      .catch(err => toast.error(err instanceof ApiError ? err.message : 'Failed to upload image'))
      .finally(() => setIsUploading(false));
  }

  function removeImage(url: string): void {
    setGroupImages(prev => prev.filter(u => u !== url));
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    try {
      const results = await Promise.all(
        group.variants.map((v, i) => {
          const row = rows[i];
          return updateVariant(productId, v.id, {
            attributes: v.attributes as Record<string, unknown>,
            images: groupImages.length > 0 ? groupImages : (product.images ?? []),
            sellingPrice: Number(row.sellingPrice),
            ...(row.mrp ? { mrp: Number(row.mrp) } : {}),
            stock: Number(row.stock),
          });
        }),
      );
      onSaved(results.map(r => r.variant));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save variants');
      setSaving(false);
    }
  }

  const nonSdEntries = Object.entries(group.nonSdAttrs);

  return (
    <div className="fixed inset-0 md:left-60 z-50 flex flex-col justify-end md:justify-center md:items-center md:p-6">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-lg max-h-[88vh] flex flex-col shadow-2xl transition-transform md:transition-none duration-300 ${
          visible ? 'translate-y-0' : 'translate-y-full md:translate-y-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-800">Edit Variants</h2>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              {nonSdEntries.length > 0 ? nonSdEntries.map(([key, val]) => {
                const field = schema.find(f => f.key === key);
                const opt = field?.options?.find(o => o.value === val);
                return <span key={key} className="text-xs text-gray-400">{opt?.label ?? val}</span>;
              }) : (
                <span className="text-xs text-gray-400">{group.variants.length} variants</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Group-level images — shared by all sizes */}
          <div>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-xs font-semibold text-gray-700">Images</span>
              <span className="text-[10px] text-gray-400 font-normal">
                optional · shared across all sizes · uses product images if none uploaded
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {groupImages.map(url => (
                <div key={url} className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  <img src={resolveImage(url)} alt="Variant" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  >
                    <X size={8} />
                  </button>
                </div>
              ))}
              {groupImages.length < MAX_SECONDARY_IMAGES && (
                <label className={`w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-teal-400 transition-colors shrink-0 bg-white ${isUploading ? 'pointer-events-none opacity-60' : ''}`}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  {isUploading
                    ? <Loader2 size={15} className="text-teal-400 animate-spin" />
                    : <Camera size={15} className="text-gray-300" />
                  }
                </label>
              )}
            </div>
          </div>

          {/* Per-size price / stock rows */}
          <div className="space-y-3">
            {group.variants.map((v, i) => {
              const sdValue = String((v.attributes as Record<string, string>)[sdField.key] ?? '');
              const sdOpt = sdField.options?.find(o => o.value === sdValue);
              const sdLabel = sdOpt?.label ?? sdValue;
              const row = rows[i];

              return (
                <div key={v.id} className="bg-gray-50 rounded-xl p-3.5">
                  <p className="text-xs font-semibold text-gray-600 mb-3">
                    {sdField.label}: <span className="text-teal-700">{sdLabel}</span>
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1">Price</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs select-none">₹</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={row.sellingPrice}
                          onChange={e => updateRow(i, 'sellingPrice', e.target.value)}
                          className="w-full border border-gray-200 rounded-lg text-xs text-gray-700 pl-6 pr-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1">MRP</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs select-none">₹</span>
                        <input
                          type="number"
                          value={row.mrp}
                          readOnly
                          placeholder="—"
                          className="w-full border border-gray-200 rounded-lg text-xs text-gray-500 pl-6 pr-2 py-2 bg-gray-100 cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1">Stock</label>
                      <input
                        type="number"
                        min={0}
                        step="1"
                        value={row.stock}
                        onChange={e => updateRow(i, 'stock', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg text-xs text-gray-700 px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-right"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl text-white text-sm font-bold disabled:opacity-60 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1B9E98 0%, #157A75 100%)' }}
          >
            {saving ? 'Saving…' : 'Save All Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Individual variant card (used when no SD field) ── */
interface VariantCardProps {
  variant: ProductVariant;
  schema: AttributeField[];
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSell: () => void;
}

function VariantCard({ variant, schema, onToggle, onEdit, onDelete, onSell }: VariantCardProps): JSX.Element {
  const imageUrl = variant.images[0] ? resolveImage(variant.images[0]) : null;
  const [imgError, setImgError] = useState(false);

  useEffect(() => { setImgError(false); }, [imageUrl]);

  const attrEntries = Object.entries(variant.attributes);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex gap-3">
        <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
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

        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex flex-wrap gap-1.5">
            {attrEntries.map(([key, value]) => {
              const field = schema.find(f => f.key === key);
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

          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-sm font-bold text-teal-600">
              ₹{variant.sellingPrice.toLocaleString('en-IN')}
            </span>
            {hasDiscount(variant.mrp, variant.sellingPrice) && (
              <span className="text-xs text-gray-400 line-through">
                ₹{variant.mrp!.toLocaleString('en-IN')}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Stock: {variant.stock}</p>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-50">
        <button
          type="button"
          onClick={onSell}
          disabled={variant.stock === 0}
          title={variant.stock === 0 ? 'Out of stock' : 'Mark as sold'}
          className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 hover:bg-teal-100 transition-colors disabled:opacity-40"
        >
          <ShoppingBag size={15} />
        </button>
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
        <div className="w-20 h-20 rounded-xl bg-gray-100 shrink-0" />
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
