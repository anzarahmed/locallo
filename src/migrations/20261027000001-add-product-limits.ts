import type { QueryInterface } from 'sequelize';
import type { AttributeField } from '../types';
import { getGroupKey, getGroupLabel } from '../utils/variantGroups';

interface ProductRow {
  id: string;
  seller_id: string;
  category_id: number | null;
  category_name: string | null;
  attribute_schema: AttributeField[] | null;
  name: string;
  created_at: Date;
}

interface VariantRow {
  product_id: string;
  attributes: Record<string, unknown> | null;
}

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE categories ADD COLUMN product_limit INTEGER CHECK (product_limit >= 0)`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE TYPE enum_product_limit_logs_reason AS ENUM ('product', 'variant_group', 'initial_balance')`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE TABLE product_limit_logs (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id     INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        category_name   VARCHAR(100) NOT NULL,
        product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
        product_name    VARCHAR(255) NOT NULL,
        group_label     VARCHAR(255),
        reason          enum_product_limit_logs_reason NOT NULL,
        units           INTEGER NOT NULL DEFAULT 1 CHECK (units > 0),
        used_after      INTEGER NOT NULL,
        limit_at_time   INTEGER,
        remaining_after INTEGER,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX product_limit_logs_seller_category_idx
         ON product_limit_logs (seller_id, category_id, created_at DESC)`,
      { transaction: t },
    );

    // Existing catalogue counts as already used, so balances are right from day one.
    const [products] = await queryInterface.sequelize.query(
      `SELECT p.id, p.seller_id, p.category_id, c.name AS category_name, c.attribute_schema,
              p.name, p.created_at
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.category_id IS NOT NULL
        ORDER BY p.created_at ASC, p.id ASC`,
      { transaction: t },
    ) as [ProductRow[], unknown];

    const [variants] = await queryInterface.sequelize.query(
      `SELECT product_id, attributes FROM product_variants ORDER BY created_at ASC, id ASC`,
      { transaction: t },
    ) as [VariantRow[], unknown];

    const variantsByProduct = new Map<string, VariantRow[]>();
    for (const v of variants) {
      const list = variantsByProduct.get(v.product_id) ?? [];
      list.push(v);
      variantsByProduct.set(v.product_id, list);
    }

    const usedBySellerCategory = new Map<string, number>();
    for (const product of products) {
      const schema = product.attribute_schema ?? [];
      const productVariants = variantsByProduct.get(product.id) ?? [];

      const groupLabels: (string | null)[] = [];
      if (productVariants.length === 0) {
        groupLabels.push(null);
      } else {
        const seen = new Set<string>();
        for (const v of productVariants) {
          const attrs = v.attributes ?? {};
          const key = getGroupKey(schema, attrs);
          if (seen.has(key)) continue;
          seen.add(key);
          groupLabels.push(getGroupLabel(schema, attrs));
        }
      }

      const counterKey = `${product.seller_id}:${product.category_id}`;
      for (const groupLabel of groupLabels) {
        const usedAfter = (usedBySellerCategory.get(counterKey) ?? 0) + 1;
        usedBySellerCategory.set(counterKey, usedAfter);
        await queryInterface.sequelize.query(
          `INSERT INTO product_limit_logs
             (seller_id, category_id, category_name, product_id, product_name, group_label,
              reason, units, used_after, created_at)
           VALUES (:sellerId, :categoryId, :categoryName, :productId, :productName, :groupLabel,
                   'initial_balance', 1, :usedAfter, :createdAt)`,
          {
            replacements: {
              sellerId:     product.seller_id,
              categoryId:   product.category_id,
              categoryName: product.category_name ?? '',
              productId:    product.id,
              productName:  product.name,
              groupLabel,
              usedAfter,
              createdAt:    product.created_at,
            },
            transaction: t,
          },
        );
      }
    }
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS product_limit_logs`, { transaction: t });
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS enum_product_limit_logs_reason`, { transaction: t });
    await queryInterface.sequelize.query(`ALTER TABLE categories DROP COLUMN IF EXISTS product_limit`, { transaction: t });
  });
}

export { up, down };
