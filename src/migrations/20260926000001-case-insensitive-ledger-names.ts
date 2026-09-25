import type { QueryInterface } from 'sequelize';

// The old unique index on (seller_id, name) was case-sensitive, so "Rent" and "rent" could
// both exist for the same seller. Merge any such duplicates onto one survivor (preferring a
// default ledger, then the oldest row) before replacing the index with a case-insensitive one.
async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `CREATE TEMP TABLE ledger_dupe_map ON COMMIT DROP AS
       WITH ranked AS (
         SELECT id, seller_id, lower(name) AS lname,
                ROW_NUMBER() OVER (
                  PARTITION BY seller_id, lower(name)
                  ORDER BY is_default DESC, created_at ASC, id ASC
                ) AS rn
         FROM seller_ledgers
       ),
       survivors AS (
         SELECT seller_id, lname, id AS survivor_id FROM ranked WHERE rn = 1
       )
       SELECT r.id AS dupe_id, s.survivor_id
       FROM ranked r
       JOIN survivors s ON s.seller_id = r.seller_id AND s.lname = r.lname
       WHERE r.rn > 1`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `UPDATE expenses e SET ledger_id = m.survivor_id
       FROM ledger_dupe_map m
       WHERE e.ledger_id = m.dupe_id`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `DELETE FROM seller_ledgers WHERE id IN (SELECT dupe_id FROM ledger_dupe_map)`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS seller_ledgers_seller_name_idx`,
      { transaction: t },
    );

    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX seller_ledgers_seller_name_lower_idx ON seller_ledgers (seller_id, lower(name))`,
      { transaction: t },
    );
  });
}

// Merged duplicates cannot be un-merged; only the index change is reversible.
async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS seller_ledgers_seller_name_lower_idx`,
      { transaction: t },
    );
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX seller_ledgers_seller_name_idx ON seller_ledgers (seller_id, name)`,
      { transaction: t },
    );
  });
}

export { up, down };
