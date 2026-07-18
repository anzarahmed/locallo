import type { QueryInterface } from 'sequelize';
import type { AttributeField } from '../types';

const SCHEMAS: Record<string, AttributeField[]> = {
  'grocery': [
    { key: 'brand',    label: 'Brand',          type: 'text',   required: false },
    { key: 'weight',   label: 'Weight / Volume', type: 'text',   required: true,  unit: 'g / ml' },
    { key: 'organic',  label: 'Organic',         type: 'select', required: false, options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }] },
  ],
  'restaurant-food': [
    {
      key: 'veg', label: 'Veg / Non-Veg', type: 'select', required: true,
      options: [{ label: 'Veg', value: 'veg' }, { label: 'Non-Veg', value: 'non-veg' }, { label: 'Egg', value: 'egg' }],
    },
    { key: 'weight',      label: 'Weight / Portion', type: 'text',     required: false, unit: 'g / ml' },
    { key: 'ingredients', label: 'Ingredients',       type: 'textarea', required: false },
    { key: 'allergens',   label: 'Allergens',          type: 'text',     required: false },
  ],
  'electronics': [
    { key: 'brand',    label: 'Brand',            type: 'text',   required: true },
    { key: 'warranty', label: 'Warranty',          type: 'number', required: false, unit: 'months' },
    { key: 'color',    label: 'Color',             type: 'text',   required: false },
    { key: 'voltage',  label: 'Voltage',           type: 'text',   required: false },
    { key: 'modelNo',  label: 'Model Number',      type: 'text',   required: false },
  ],
  'fashion-clothing': [
    {
      key: 'sizeType', label: 'Size Type', type: 'select', required: true,
      options: [{ label: 'S / M / L', value: 'alpha' }, { label: '36 – 44 (Numeric)', value: 'numeric' }, { label: 'Kids (Age)', value: 'kids' }],
    },
    {
      key: 'sizes', label: 'Available Sizes', type: 'multiselect', required: true,
      options: [
        { label: 'XS', value: 'XS' }, { label: 'S', value: 'S' }, { label: 'M', value: 'M' },
        { label: 'L', value: 'L' }, { label: 'XL', value: 'XL' }, { label: 'XXL', value: 'XXL' },
        { label: '36', value: '36' }, { label: '38', value: '38' }, { label: '40', value: '40' },
        { label: '42', value: '42' }, { label: '44', value: '44' },
        { label: '2Y', value: '2Y' }, { label: '4Y', value: '4Y' }, { label: '6Y', value: '6Y' },
        { label: '8Y', value: '8Y' }, { label: '10Y', value: '10Y' }, { label: '12Y', value: '12Y' },
      ],
    },
    {
      key: 'colors', label: 'Available Colors', type: 'color', required: false,
      options: [
        { label: 'Black',  value: 'black' }, { label: 'White',  value: 'white' },
        { label: 'Red',    value: 'red' }, { label: 'Blue',   value: 'blue' },
        { label: 'Green',  value: 'green' }, { label: 'Yellow', value: 'yellow' },
        { label: 'Pink',   value: 'pink' }, { label: 'Beige',  value: 'beige' },
        { label: 'Brown',  value: 'brown' }, { label: 'Grey',   value: 'grey' },
        { label: 'Orange', value: 'orange' }, { label: 'Purple', value: 'purple' },
      ],
    },
    { key: 'material',      label: 'Material / Composition', type: 'text',     required: false },
    { key: 'careInstructions', label: 'Care Instructions',   type: 'textarea', required: false },
    { key: 'countryOfOrigin',  label: 'Country of Origin',   type: 'text',     required: false },
  ],
  'pharmacy': [
    { key: 'manufacturer', label: 'Manufacturer',    type: 'text',     required: true },
    { key: 'dosage',       label: 'Dosage / Strength', type: 'text',   required: false },
    { key: 'composition',  label: 'Composition',      type: 'textarea', required: false },
    { key: 'expiryNote',   label: 'Expiry / Shelf Life', type: 'text', required: false },
  ],
  'beauty-personal-care': [
    { key: 'brand',       label: 'Brand',           type: 'text',     required: true },
    { key: 'volume',      label: 'Volume / Weight', type: 'text',     required: true, unit: 'ml / g' },
    { key: 'skinType',    label: 'Suitable For',    type: 'text',     required: false },
    { key: 'ingredients', label: 'Key Ingredients', type: 'textarea', required: false },
    { key: 'usage',       label: 'How to Use',      type: 'textarea', required: false },
  ],
  'home-kitchen': [
    { key: 'material',   label: 'Material',    type: 'text', required: false },
    { key: 'dimensions', label: 'Dimensions',  type: 'text', required: false },
    { key: 'color',      label: 'Color',       type: 'text', required: false },
    { key: 'brand',      label: 'Brand',       type: 'text', required: false },
    { key: 'warranty',   label: 'Warranty',    type: 'number', required: false, unit: 'months' },
  ],
  'sports-fitness': [
    { key: 'brand',    label: 'Brand',    type: 'text', required: false },
    { key: 'size',     label: 'Size',     type: 'text', required: false },
    { key: 'material', label: 'Material', type: 'text', required: false },
    { key: 'color',    label: 'Color',    type: 'text', required: false },
    { key: 'weight',   label: 'Weight',   type: 'text', required: false, unit: 'kg' },
  ],
  'books-stationery': [
    { key: 'author',    label: 'Author',    type: 'text',   required: false },
    { key: 'publisher', label: 'Publisher', type: 'text',   required: false },
    { key: 'isbn',      label: 'ISBN',      type: 'text',   required: false },
    { key: 'language',  label: 'Language',  type: 'text',   required: false },
    { key: 'pages',     label: 'Pages',     type: 'number', required: false },
    { key: 'edition',   label: 'Edition',   type: 'text',   required: false },
  ],
  'other': [],
};

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.sequelize.query(
      `ALTER TABLE categories ADD COLUMN attribute_schema JSONB`,
      { transaction: t },
    );

    for (const [slug, schema] of Object.entries(SCHEMAS)) {
      await queryInterface.sequelize.query(
        `UPDATE categories SET attribute_schema = :schema WHERE slug = :slug`,
        { replacements: { schema: JSON.stringify(schema), slug }, transaction: t },
      );
    }
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `ALTER TABLE categories DROP COLUMN attribute_schema`,
  );
}

export { up, down };
