import type { QueryInterface } from 'sequelize';

const DEFAULT_PRODUCT_LIMIT = 200;

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `UPDATE categories SET product_limit = :limit, updated_at = NOW() WHERE product_limit IS NULL`,
      { replacements: { limit: DEFAULT_PRODUCT_LIMIT }, transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE categories ALTER COLUMN product_limit SET NOT NULL`,
      { transaction: t },
    );
    // Backfilled usage rows predate any limit; give them a balance so the log reads consistently.
    await queryInterface.sequelize.query(
      `UPDATE product_limit_logs l
          SET limit_at_time = c.product_limit,
              remaining_after = c.product_limit - l.used_after
         FROM categories c
        WHERE c.id = l.category_id AND l.limit_at_time IS NULL`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`ALTER TABLE categories ALTER COLUMN product_limit DROP NOT NULL`);
}

export { up, down };
