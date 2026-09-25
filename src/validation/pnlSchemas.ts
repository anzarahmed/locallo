import * as Yup from 'yup';

const RESERVED_LEDGER_PATTERN = /(^|[^a-z])purchas(e|es|ed|ing)([^a-z]|$)/i;

export const RESERVED_LEDGER_MESSAGE = 'Ledger names cannot contain "Purchase" — stock you add is automatically recorded as a purchase';

export function isReservedLedgerName(name: string): boolean {
  return RESERVED_LEDGER_PATTERN.test(name);
}

export const ledgerSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required('Ledger name is required')
    .test('not-reserved', RESERVED_LEDGER_MESSAGE, (value) => !value || !isReservedLedgerName(value)),
});

export type LedgerFormValues = Yup.InferType<typeof ledgerSchema>;

export const expenseSchema = Yup.object({
  ledgerId:    Yup.string().required('Please select a ledger'),
  amount:      Yup.number().typeError('Enter a valid amount').positive('Must be positive').required('Amount is required'),
  description: Yup.string().max(255).optional(),
  expenseDate: Yup.string().required('Date is required'),
});

export type ExpenseFormValues = Yup.InferType<typeof expenseSchema>;
