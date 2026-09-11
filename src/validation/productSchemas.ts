import * as Yup from 'yup';

export const addProductSchema = Yup.object({
  name:         Yup.string().required('Product name is required'),
  description:  Yup.string().required('Description is required'),
  categoryId:   Yup.number().integer().positive('Please select a category').required('Please select a category'),
  sellingPrice: Yup.number().typeError('Enter a valid amount').positive('Must be positive').required('Selling price is required'),
  mrp:          Yup.number().typeError('Enter a valid amount').positive('Must be positive').required('MRP is required')
    .test('mrp-gte-selling-price', 'MRP must be greater than or equal to Selling Price', function (mrp) {
      const { sellingPrice } = this.parent as { sellingPrice: number | undefined };
      if (mrp == null || sellingPrice == null || Number.isNaN(sellingPrice)) return true;
      return mrp >= sellingPrice;
    }),
  costPrice:    Yup.number().typeError('Enter a valid amount').positive('Must be positive').required('Cost price is required'),
  stock:        Yup.number().typeError('Enter a whole number').integer('Must be a whole number').min(0, 'Cannot be negative').required('Stock is required'),
});

// Edit keeps MRP optional: legacy products created before MRP was mandatory may
// have no value, and the Edit form's MRP field is read-only so the user can't fix it.
// Because MRP can't be edited here, the mrp>=sellingPrice constraint is enforced on
// sellingPrice instead — that's the field the user can actually change to resolve it.
export const editProductSchema = addProductSchema.shape({
  mrp: Yup.number().typeError('Enter a valid amount').positive('Must be positive').optional()
    .test('mrp-gte-selling-price', 'MRP must be greater than or equal to Selling Price', function (mrp) {
      const { sellingPrice } = this.parent as { sellingPrice: number | undefined };
      if (mrp == null || sellingPrice == null || Number.isNaN(sellingPrice)) return true;
      return mrp >= sellingPrice;
    }),
  sellingPrice: Yup.number().typeError('Enter a valid amount').positive('Must be positive').required('Selling price is required')
    .test('selling-price-lte-mrp', 'MRP must be greater than or equal to Selling Price', function (sellingPrice) {
      const { mrp } = this.parent as { mrp: number | undefined };
      if (sellingPrice == null || mrp == null || Number.isNaN(mrp)) return true;
      return sellingPrice <= mrp;
    }),
});

export interface AddProductFormValues {
  name: string;
  description: string;
  categoryId: number;
  sellingPrice: string;
  mrp: string;
  costPrice: string;
  stock: string;
}
