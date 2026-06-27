import * as Yup from 'yup';

const productRowSchema = Yup.object({
  attributes: Yup.object().unknown(true).optional().default({}),
  stock:      Yup.number().integer().min(0, 'Stock cannot be negative').required('Stock is required'),
});

export const createProductSchema = Yup.object({
  name:          Yup.string().max(255).required('Product name is required'),
  description:   Yup.string().required('Description is required'),
  sellingPrice:  Yup.number().positive('Selling price must be positive').required('Selling price is required'),
  mrp:           Yup.number().positive('MRP must be positive').optional(),
  costPrice:     Yup.number().positive('Cost price must be positive').optional(),
  categoryId:    Yup.number().integer().positive().required('Category is required'),
  stock:         Yup.number().integer().min(0, 'Stock cannot be negative').when('rows', {
    is: (v: unknown[]) => Array.isArray(v) && v.length > 0,
    then: schema => schema.optional().default(0),
    otherwise: schema => schema.required('Stock is required'),
  }),
  images:        Yup.array(Yup.string().required()).min(1, 'At least one image is required').required(),
  attributes:    Yup.object().unknown(true).optional().default({}),
  pickupAddress: Yup.string().optional(),
  pickupLat:     Yup.number().optional(),
  pickupLong:    Yup.number().optional(),
  rows:          Yup.array(productRowSchema).optional(),
});

export const updateProductSchema = Yup.object({
  name:          Yup.string().max(255).optional(),
  description:   Yup.string().optional(),
  sellingPrice:  Yup.number().positive().optional(),
  mrp:           Yup.number().positive().optional(),
  costPrice:     Yup.number().positive().optional(),
  categoryId:    Yup.number().integer().positive().optional(),
  stock:         Yup.number().integer().min(0).optional(),
  images:        Yup.array(Yup.string().required()).min(1).optional(),
  attributes:    Yup.object().unknown(true).optional(),
  pickupAddress: Yup.string().optional(),
  pickupLat:     Yup.number().optional(),
  pickupLong:    Yup.number().optional(),
});
