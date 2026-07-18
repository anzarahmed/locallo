import { type JSX } from 'react';
import { X, Package } from 'lucide-react';
import { resolveImage } from '../../lib/imageUtils';
import type { ProductVariant, AttributeField } from '../../types';

interface VariantPickerModalProps {
  productName: string;
  variants: ProductVariant[];
  schema: AttributeField[];
  onSelect: (variant: ProductVariant) => void;
  onClose: () => void;
}

export default function VariantPickerModal({
  productName,
  variants,
  schema,
  onSelect,
  onClose,
}: VariantPickerModalProps): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Select Variant to Sell</h3>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{productName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Variant list */}
        <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-2">
          {variants.map(variant => {
            const outOfStock = variant.stock === 0;
            const imageUrl = variant.images[0] ? resolveImage(variant.images[0]) : null;

            return (
              <button
                key={variant.id}
                type="button"
                disabled={outOfStock}
                onClick={() => onSelect(variant)}
                className={`w-full text-left p-3 rounded-xl border transition-colors flex gap-3 items-center ${
                  outOfStock
                    ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                    : 'border-gray-100 hover:border-teal-200 hover:bg-teal-50 active:bg-teal-100'
                }`}
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                  {imageUrl ? (
                    <img src={imageUrl} alt="Variant" className="w-full h-full object-cover" />
                  ) : (
                    <Package size={16} className="text-gray-300" />
                  )}
                </div>

                {/* Attributes + stock */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(variant.attributes).map(([key, value]) => {
                      const field = schema.find(f => f.key === key);
                      const displayVal = field?.options?.find(o => o.value === String(value))?.label ?? String(value);
                      const fieldLabel = field?.label ?? key;
                      return (
                        <span key={key} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                          {fieldLabel}: {displayVal}
                        </span>
                      );
                    })}
                    {Object.keys(variant.attributes).length === 0 && (
                      <span className="text-[11px] text-gray-400 italic">No attributes</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs font-bold text-teal-600">
                      ₹{variant.sellingPrice.toLocaleString('en-IN')}
                    </span>
                    {outOfStock ? (
                      <span className="text-[10px] font-semibold text-rose-400 bg-rose-50 px-2 py-0.5 rounded-full">
                        Out of stock
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">
                        Stock: {variant.stock}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
