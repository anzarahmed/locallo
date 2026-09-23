import { useMemo, useState, type JSX } from 'react';
import { Package } from 'lucide-react';
import { resolveImage } from '../../lib/imageUtils';
import { variantLabel, groupVariants, groupLabel, pickBoostVariant } from '../../lib/variantUtils';
import type { ProductVariant, AttributeField } from '../../types';

interface PickerGroup {
  key: string;
  label: string;
  variants: ProductVariant[];
  thumbnailSrc: string | undefined;
}

interface PromoteVariantPickerModalProps {
  productName: string;
  variants: ProductVariant[];
  schema: AttributeField[];
  onConfirm: (variant: ProductVariant) => void;
  onClose: () => void;
}

export default function PromoteVariantPickerModal({
  productName,
  variants,
  schema,
  onConfirm,
  onClose,
}: PromoteVariantPickerModalProps): JSX.Element {
  const sdField = schema.find(f => f.isVariant === true && f.isStockDependent === true);

  const groups = useMemo<PickerGroup[]>(() => {
    const activeVariants = variants.filter(v => v.isActive);
    if (sdField) {
      return groupVariants(activeVariants, sdField.key).map(g => ({
        key: g.key,
        label: groupLabel(g.nonSdAttrs, schema),
        variants: g.variants,
        thumbnailSrc: g.variants[0]?.thumbnails?.[0] ?? g.variants[0]?.images[0],
      }));
    }
    return activeVariants.map(v => ({
      key: v.id,
      label: variantLabel(v.attributes, schema),
      variants: [v],
      thumbnailSrc: v.thumbnails?.[0] ?? v.images[0],
    }));
  }, [variants, schema, sdField]);

  const [selectedKey, setSelectedKey] = useState<string | null>(groups[0]?.key ?? null);
  const selectedGroup = groups.find(g => g.key === selectedKey) ?? null;

  function handleConfirm(): void {
    if (!selectedGroup) return;
    onConfirm(pickBoostVariant(selectedGroup.variants));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl max-h-[80vh] flex flex-col">
        <div className="px-5 pt-5 pb-3 shrink-0">
          <h3 className="text-base font-bold text-gray-800">Select variant to promote</h3>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{productName}</p>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-1 flex flex-col gap-2">
          {groups.map(group => {
            const imageUrl = group.thumbnailSrc ? resolveImage(group.thumbnailSrc) : null;
            const selectedRow = group.key === selectedKey;
            const optionCount = group.variants.length;
            const bestStock = Math.max(...group.variants.map(v => v.stock));

            const thumbnail = (
              <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                {imageUrl ? (
                  <img src={imageUrl} alt="Variant" className="w-full h-full object-cover" />
                ) : (
                  <Package size={16} className="text-gray-300" />
                )}
              </div>
            );

            return (
              <button
                key={group.key}
                type="button"
                onClick={() => setSelectedKey(group.key)}
                className={`w-full text-left p-3 rounded-xl border transition-colors flex gap-3 items-center ${
                  selectedRow ? 'border-teal-200 bg-teal-50/60' : 'border-gray-100 hover:bg-gray-50'
                }`}
              >
                {thumbnail}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-indigo-600 truncate">{group.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {optionCount} option{optionCount !== 1 ? 's' : ''} · Best stock: {bestStock}
                  </p>
                </div>

                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedRow ? 'border-teal-600' : 'border-gray-300'
                  }`}
                >
                  {selectedRow && <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />}
                </span>
              </button>
            );
          })}

          {groups.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No variants available to promote right now.</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedGroup}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #1B9E98 0%, #157A75 100%)' }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
