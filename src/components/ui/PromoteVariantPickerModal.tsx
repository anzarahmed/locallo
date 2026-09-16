import { useState, type JSX } from 'react';
import { Package } from 'lucide-react';
import { resolveImage } from '../../lib/imageUtils';
import { variantLabel } from '../../lib/variantUtils';
import type { ProductVariant, AttributeField } from '../../types';

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
  const [selectedId, setSelectedId] = useState<string | null>(variants[0]?.id ?? null);
  const selected = variants.find(v => v.id === selectedId) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl max-h-[80vh] flex flex-col">
        <div className="px-5 pt-5 pb-3 shrink-0">
          <h3 className="text-base font-bold text-gray-800">Select variant to promote</h3>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{productName}</p>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-1 flex flex-col gap-2">
          {variants.map(variant => {
            const thumbnailSrc = variant.thumbnails?.[0] ?? variant.images[0];
            const imageUrl = thumbnailSrc ? resolveImage(thumbnailSrc) : null;
            const selectedRow = variant.id === selectedId;

            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => setSelectedId(variant.id)}
                className={`w-full text-left p-3 rounded-xl border transition-colors flex gap-3 items-center ${
                  selectedRow ? 'border-teal-200 bg-teal-50/60' : 'border-gray-100 hover:bg-gray-50'
                }`}
              >
                <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                  {imageUrl ? (
                    <img src={imageUrl} alt="Variant" className="w-full h-full object-cover" />
                  ) : (
                    <Package size={16} className="text-gray-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-indigo-600 truncate">
                    {variantLabel(variant.attributes, schema)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Stock: {variant.stock}</p>
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
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected}
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
