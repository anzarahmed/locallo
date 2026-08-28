import * as Yup from 'yup';

export const createLedgerSchema = Yup.object({
  name: Yup.string().trim().max(255).required('Ledger name is required'),
});
