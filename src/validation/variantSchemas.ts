import * as Yup from 'yup';

export const variantFormSchema = Yup.object({
  sellingPrice: Yup.number().typeError('Enter a valid amount').positive('Must be positive').required('Selling price is required'),
  mrp:          Yup.number().typeError('Enter a valid amount').positive('Must be positive').optional(),
  stock:        Yup.number().typeError('Enter a whole number').integer('Must be a whole number').min(0, 'Cannot be negative').required('Stock is required'),
});

export interface VariantFormValues {
  sellingPrice: string;
  mrp: string;
  stock: string;
}
