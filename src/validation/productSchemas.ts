import * as Yup from 'yup';

export const addProductSchema = Yup.object({
  name:         Yup.string().required('Product name is required'),
  description:  Yup.string().required('Description is required'),
  categoryId:   Yup.number().integer().positive('Please select a category').required('Please select a category'),
  sellingPrice: Yup.number().typeError('Enter a valid amount').positive('Must be positive').required('Selling price is required'),
  mrp:          Yup.number().typeError('Enter a valid amount').positive('Must be positive').required('MRP is required'),
  costPrice:    Yup.number().typeError('Enter a valid amount').positive('Must be positive').required('Cost price is required'),
  stock:        Yup.number().typeError('Enter a whole number').integer('Must be a whole number').min(0, 'Cannot be negative').required('Stock is required'),
});

// Edit keeps MRP optional: legacy products created before MRP was mandatory may
// have no value, and the Edit form's MRP field is read-only so the user can't fix it.
export const editProductSchema = addProductSchema.shape({
  mrp: Yup.number().typeError('Enter a valid amount').positive('Must be positive').optional(),
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
