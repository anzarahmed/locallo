import * as Yup from 'yup';

export const createExpenseSchema = Yup.object({
  ledgerId:    Yup.string().uuid('Invalid ledger').required('Ledger is required'),
  amount:      Yup.number().positive('Amount must be positive').required('Amount is required'),
  description: Yup.string().max(255).optional(),
  expenseDate: Yup.date().required('Expense date is required'),
});

export const updateExpenseSchema = Yup.object({
  ledgerId:    Yup.string().uuid('Invalid ledger').optional(),
  amount:      Yup.number().positive('Amount must be positive').optional(),
  description: Yup.string().max(255).optional(),
  expenseDate: Yup.date().optional(),
});
