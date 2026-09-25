import * as Yup from 'yup';

// Stock additions are already booked as purchases (purchase_logs), so any user ledger
// mentioning "purchase" would be confused with — or double-count — that figure in the P&L.
// [^a-z] instead of \b so "_" counts as a separator (e.g. "Purchase_Account").
const RESERVED_LEDGER_PATTERN = /(^|[^a-z])purchas(e|es|ed|ing)([^a-z]|$)/i;

export const createLedgerSchema = Yup.object({
  name: Yup.string()
    .trim()
    .max(255)
    .required('Ledger name is required')
    .test(
      'not-reserved',
      'Ledger names cannot contain "Purchase" — stock you add is automatically recorded as a purchase',
      (value) => !value || !RESERVED_LEDGER_PATTERN.test(value),
    ),
});
