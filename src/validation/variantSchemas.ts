import * as Yup from 'yup';

// MRP is read-only in this form (pre-filled from the parent product / existing variant),
// so the mrp>=sellingPrice constraint is enforced on sellingPrice — the field the user
// can actually change to resolve it.
export const variantFormSchema = Yup.object({
  sellingPrice: Yup.number().typeError('Enter a valid amount').positive('Must be positive').required('Selling price is required')
    .test('selling-price-lte-mrp', 'MRP must be greater than or equal to Selling Price', function (sellingPrice) {
      const { mrp } = this.parent as { mrp: number | undefined };
      if (sellingPrice == null || mrp == null || Number.isNaN(mrp)) return true;
      return sellingPrice <= mrp;
    }),
  mrp:          Yup.number().typeError('Enter a valid amount').positive('Must be positive').optional()
    .test('mrp-gte-selling-price', 'MRP must be greater than or equal to Selling Price', function (mrp) {
      const { sellingPrice } = this.parent as { sellingPrice: number | undefined };
      if (mrp == null || sellingPrice == null || Number.isNaN(sellingPrice)) return true;
      return mrp >= sellingPrice;
    }),
  stock:        Yup.number().typeError('Enter a whole number').integer('Must be a whole number').min(0, 'Cannot be negative').required('Stock is required'),
});

export interface VariantFormValues {
  sellingPrice: string;
  mrp: string;
  stock: string;
}
