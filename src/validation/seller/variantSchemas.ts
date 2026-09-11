import * as Yup from 'yup';

const mrpGteSellingPrice = {
  name: 'mrp-gte-selling-price',
  message: 'MRP must be greater than or equal to Selling Price',
  test(mrp: number | null | undefined, ctx: Yup.TestContext): boolean {
    const { sellingPrice } = ctx.parent as { sellingPrice: number | undefined };
    if (mrp == null || sellingPrice == null) return true;
    return mrp >= sellingPrice;
  },
};

export const createVariantSchema = Yup.object({
  attributes:   Yup.object().unknown(true).required('Variant attributes are required'),
  images:       Yup.array(Yup.string().required()).min(1, 'At least one image is required').required(),
  stock:        Yup.number().integer().min(0, 'Stock cannot be negative').required('Stock is required'),
  sellingPrice: Yup.number().positive('Selling price must be positive').required('Selling price is required'),
  mrp:          Yup.number().positive('MRP must be positive').optional().test(mrpGteSellingPrice),
  isActive:     Yup.boolean().optional(),
});

export const createBatchVariantSchema = Yup.object({
  attributes:   Yup.object().unknown(true).optional().default({}),
  images:       Yup.array(Yup.string().required()).min(1, 'At least one image is required').required(),
  sellingPrice: Yup.number().positive('Selling price must be positive').required('Selling price is required'),
  mrp:          Yup.number().positive('MRP must be positive').optional().test(mrpGteSellingPrice),
  isActive:     Yup.boolean().optional(),
  rows:         Yup.array(
    Yup.object({
      attributes: Yup.object().unknown(true).required(),
      stock:      Yup.number().integer().min(0).required(),
    }).required(),
  ).min(1, 'At least one variant row is required').required(),
});

export const updateVariantSchema = Yup.object({
  images:       Yup.array(Yup.string().required()).min(1, 'At least one image is required').optional(),
  stock:        Yup.number().integer().min(0).optional(),
  sellingPrice: Yup.number().positive().optional(),
  mrp:          Yup.number().positive().optional().nullable().test(mrpGteSellingPrice),
  isActive:     Yup.boolean().optional(),
});
