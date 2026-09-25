import type { QueryInterface } from 'sequelize';

// "Purchase" is reserved: stock additions are already booked as purchases via purchase_logs.
// Expenses are moved to "Other Expenses" first because expenses.ledger_id cascades on delete.
async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `INSERT INTO seller_ledgers (seller_id, name, is_default)
       SELECT DISTINCT sl.seller_id, 'Other Expenses', true
       FROM seller_ledgers sl
       WHERE lower(trim(sl.name)) IN ('purchase', 'purchases')
       ON CONFLICT (seller_id, name) DO NOTHING`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `UPDATE expenses e
       SET ledger_id = other.id, updated_at = NOW()
       FROM seller_ledgers p
       JOIN seller_ledgers other ON other.seller_id = p.seller_id AND other.name = 'Other Expenses'
       WHERE e.ledger_id = p.id AND lower(trim(p.name)) IN ('purchase', 'purchases')`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `DELETE FROM seller_ledgers WHERE lower(trim(name)) IN ('purchase', 'purchases')`,
      { transaction: t },
    );
  });
}

// Expenses moved to "Other Expenses" cannot be told apart afterwards, so down only
// restores the empty default ledger.
async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `INSERT INTO seller_ledgers (seller_id, name, is_default)
     SELECT id, 'Purchase', true FROM users WHERE role = 'SELLER'
     ON CONFLICT (seller_id, name) DO NOTHING`,
  );
}

export { up, down };
