import * as Yup from 'yup';

export const addProductSchema = Yup.object({
  name:         Yup.string().required('Product name is required'),
  description:  Yup.string().required('Description is required'),
  categoryId:   Yup.number().integer().positive('Please select a category').required('Please select a category'),
  sellingPrice: Yup.number().typeError('Enter a valid amount').positive('Must be positive').required('Selling price is required'),
  mrp:          Yup.number().typeError('Enter a valid amount').positive('Must be positive').optional(),
  costPrice:    Yup.number().typeError('Enter a valid amount').positive('Must be positive').optional(),
  stock:        Yup.number().typeError('Enter a whole number').integer('Must be a whole number').min(0, 'Cannot be negative').required('Stock is required'),
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
