import type { QueryInterface } from 'sequelize';

// Removes ledgers like "Purchase Account" / "To Purchase" that are now rejected by
// createLedgerSchema. expenses.ledger_id cascades, so their expenses are deleted too.
async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `DELETE FROM seller_ledgers WHERE name ~* '(^|[^a-z])purchas(e|es|ed|ing)([^a-z]|$)'`,
      { transaction: t },
    );
  });
}

// Deleted ledgers and their cascaded expenses cannot be restored.
async function down(): Promise<void> {
  return;
}

export { up, down };
