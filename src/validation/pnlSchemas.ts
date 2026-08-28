import * as Yup from 'yup';

export const ledgerSchema = Yup.object({
  name: Yup.string().trim().required('Ledger name is required'),
});

export type LedgerFormValues = Yup.InferType<typeof ledgerSchema>;

export const expenseSchema = Yup.object({
  ledgerId:    Yup.string().required('Please select a ledger'),
  amount:      Yup.number().typeError('Enter a valid amount').positive('Must be positive').required('Amount is required'),
  description: Yup.string().max(255).optional(),
  expenseDate: Yup.string().required('Date is required'),
});

export type ExpenseFormValues = Yup.InferType<typeof expenseSchema>;
