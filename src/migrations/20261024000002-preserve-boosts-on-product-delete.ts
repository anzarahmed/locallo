import type { QueryInterface } from 'sequelize';

// Boost rows are payment records: deleting a product must not delete them. product_id
// becomes nullable with ON DELETE SET NULL, and product_name keeps the label for the
// Payments pages and payment emails once the product is gone.
async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts ADD COLUMN product_name VARCHAR(255)`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `UPDATE product_boosts b SET product_name = p.name FROM products p WHERE p.id = b.product_id`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts ALTER COLUMN product_id DROP NOT NULL`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts DROP CONSTRAINT product_boosts_product_id_fkey`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts ADD CONSTRAINT product_boosts_product_id_fkey
         FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(`DELETE FROM product_boosts WHERE product_id IS NULL`, { transaction: t });
    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts DROP CONSTRAINT product_boosts_product_id_fkey`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts ADD CONSTRAINT product_boosts_product_id_fkey
         FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE product_boosts ALTER COLUMN product_id SET NOT NULL`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(`ALTER TABLE product_boosts DROP COLUMN product_name`, { transaction: t });
  });
}

export { up, down };
