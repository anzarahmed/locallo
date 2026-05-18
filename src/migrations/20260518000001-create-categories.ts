import type { QueryInterface } from 'sequelize';

const INITIAL_CATEGORIES = [
  { name: 'Grocery',                slug: 'grocery',                  sort_order: 1 },
  { name: 'Restaurant & Food',      slug: 'restaurant-food',          sort_order: 2 },
  { name: 'Electronics',            slug: 'electronics',              sort_order: 3 },
  { name: 'Fashion & Clothing',     slug: 'fashion-clothing',         sort_order: 4 },
  { name: 'Pharmacy',               slug: 'pharmacy',                 sort_order: 5 },
  { name: 'Beauty & Personal Care', slug: 'beauty-personal-care',     sort_order: 6 },
  { name: 'Home & Kitchen',         slug: 'home-kitchen',             sort_order: 7 },
  { name: 'Sports & Fitness',       slug: 'sports-fitness',           sort_order: 8 },
  { name: 'Books & Stationery',     slug: 'books-stationery',         sort_order: 9 },
  { name: 'Other',                  slug: 'other',                    sort_order: 10 },
];

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `CREATE TABLE categories (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(100) NOT NULL UNIQUE,
        slug       VARCHAR(100) NOT NULL UNIQUE,
        is_active  BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      { transaction: t },
    );

    const rows = INITIAL_CATEGORIES.map(c =>
      `('${c.name}', '${c.slug}', TRUE, ${c.sort_order}, NOW(), NOW())`
    ).join(', ');

    await queryInterface.sequelize.query(
      `INSERT INTO categories (name, slug, is_active, sort_order, created_at, updated_at) VALUES ${rows}`,
      { transaction: t },
    );
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`DROP TABLE IF EXISTS categories`);
}

export { up, down };
