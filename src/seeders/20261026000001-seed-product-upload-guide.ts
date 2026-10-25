import type { QueryInterface } from 'sequelize';

// Linked from the "How to Upload Products" seller email; editable from the admin CMS.
const PAGE = {
  title: 'Product Upload Guide',
  slug: 'product-upload-guide',
  content: `<h1>Product Upload Guide</h1>
<p>Follow these steps to add a product to your Loccalo store so customers can discover it.</p>
<h2>1. Add a clear product photo</h2>
<p>Tap <strong>Add Product</strong> and upload your first image. Use good lighting and a plain background. Loccalo reads the photo and suggests a name, description, category and attributes for you.</p>
<h2>2. Check the details</h2>
<ul>
<li><p><strong>Name</strong>: short and specific, e.g. "Men's Cotton Kurta – Navy Blue".</p></li>
<li><p><strong>Description</strong>: material, size, use and anything customers ask you about in the shop.</p></li>
<li><p><strong>Category and attributes</strong>: pick the right category so the product appears in the right searches.</p></li>
</ul>
<h2>3. Set price and stock</h2>
<p>Enter the selling price and MRP. Customers see the discount when the MRP is higher. Enter how many pieces you have in stock; products with zero stock are hidden from customers.</p>
<h2>4. Add variants (optional)</h2>
<p>If the product comes in different sizes or colours, open <strong>Variants</strong> and add each option with its own price, stock and images.</p>
<h2>5. Keep it updated</h2>
<p>Update stock as you sell, refresh photos, and hide products you no longer carry. Accurate listings bring more customers to your shop.</p>`,
};

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `INSERT INTO cms_pages (title, slug, content, audience, is_active, created_at, updated_at)
     SELECT :title, :slug, :content, 'seller', TRUE, NOW(), NOW()
     WHERE NOT EXISTS (SELECT 1 FROM cms_pages WHERE audience = 'seller' AND slug = :slug)`,
    { replacements: PAGE },
  );
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `DELETE FROM cms_pages WHERE audience = 'seller' AND slug = :slug`,
    { replacements: { slug: PAGE.slug } },
  );
}

export { up, down };
