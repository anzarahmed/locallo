import * as Yup from 'yup';

export const createVariantSchema = Yup.object({
  attributes:   Yup.object().unknown(true).required('Variant attributes are required'),
  images:       Yup.array(Yup.string().required()).min(1, 'At least one image is required').required(),
  stock:        Yup.number().integer().min(0, 'Stock cannot be negative').required('Stock is required'),
  sellingPrice: Yup.number().positive('Selling price must be positive').required('Selling price is required'),
  mrp:          Yup.number().positive('MRP must be positive').optional(),
  isActive:     Yup.boolean().optional(),
});

export const createBatchVariantSchema = Yup.object({
  attributes:   Yup.object().unknown(true).optional().default({}),
  images:       Yup.array(Yup.string().required()).min(1, 'At least one image is required').required(),
  sellingPrice: Yup.number().positive('Selling price must be positive').required('Selling price is required'),
  mrp:          Yup.number().positive('MRP must be positive').optional(),
  isActive:     Yup.boolean().optional(),
  rows:         Yup.array(
    Yup.object({
      attributes: Yup.object().unknown(true).required(),
      stock:      Yup.number().integer().min(0).required(),
    }).required(),
  ).min(1, 'At least one variant row is required').required(),
});

export const updateVariantSchema = Yup.object({
  attributes:   Yup.object().unknown(true).optional(),
  images:       Yup.array(Yup.string().required()).min(1, 'At least one image is required').optional(),
  stock:        Yup.number().integer().min(0).optional(),
  sellingPrice: Yup.number().positive().optional(),
  mrp:          Yup.number().positive().optional().nullable(),
  isActive:     Yup.boolean().optional(),
});
