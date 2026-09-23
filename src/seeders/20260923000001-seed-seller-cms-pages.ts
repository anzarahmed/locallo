import type { QueryInterface } from 'sequelize';

interface CmsPageSeed {
  title: string;
  slug: string;
  content: string;
}

const PAGES: CmsPageSeed[] = [
  {
    title: 'Seller Privacy Policy',
    slug: 'privacy-policy',
    content: `<h1>Seller Privacy Policy</h1>
<p>This Privacy Policy explains how Localo ("we", "us", "our") collects, uses and protects information about sellers who use the Localo Seller app and Seller web panel (together, the "Seller Platform").</p>
<h2>Information We Collect</h2>
<ul>
<li><p><strong>Account information</strong>: mobile number, full name, email address, and the device ID and device type used to sign in.</p></li>
<li><p><strong>Business information</strong>: shop name, business categories, brands, bio, working hours, and special-hours overrides.</p></li>
<li><p><strong>Shop location</strong>: shop address, city, state, pincode and map coordinates, used to show your shop to nearby customers.</p></li>
<li><p><strong>Verification documents</strong>: KYC and brand verification documents you provide for onboarding.</p></li>
<li><p><strong>Listings and activity</strong>: products, variants, images, prices, stock, sold and purchase logs, expenses, and ledgers you record.</p></li>
<li><p><strong>Payment information</strong>: transaction references for boosts and other paid features. Card and UPI details are handled by our payment partner and are never stored by Localo.</p></li>
</ul>
<h2>How We Use Your Information</h2>
<ul>
<li><p>To verify your identity through OTP and keep your account secure.</p></li>
<li><p>To verify your business before your shop is visible to customers.</p></li>
<li><p>To display your shop, products, and working hours to customers.</p></li>
<li><p>To give you business tools such as profit and loss reports, expenses, and sales logs.</p></li>
<li><p>To send notifications you have opted into through your Settings.</p></li>
</ul>
<h2>What Customers Can See</h2>
<p>Customers see your shop name, owner name, photo, bio, address, location, categories, working hours, ratings, and active products. Your mobile number, email, verification documents, cost prices, and financial records are never shown to customers.</p>
<h2>How We Protect Your Information</h2>
<p>Images and documents are stored in private cloud storage. Verification documents are only shared through short-lived signed links with authorised Localo staff. We do not sell your personal or business information to third parties.</p>
<h2>Data Retention and Account Deletion</h2>
<p>You can request deletion of your account from the app. We keep only the records we are legally required to retain, such as payment transactions, and delete or anonymise the rest.</p>
<h2>Contact Us</h2>
<p>If you have questions about this Privacy Policy, please contact our seller support team through the app.</p>`,
  },
  {
    title: 'Seller Terms & Conditions',
    slug: 'terms-and-conditions',
    content: `<h1>Seller Terms &amp; Conditions</h1>
<p>These Terms &amp; Conditions ("Terms") govern your use of the Localo Seller app and Seller web panel (together, the "Seller Platform"). By signing in to the Seller Platform, you agree to these Terms.</p>
<h2>Eligibility and Onboarding</h2>
<ul>
<li><p>Seller accounts are created and verified by the Localo team. Your shop becomes visible to customers only after verification.</p></li>
<li><p>You must provide accurate business, contact, and location details, and keep them up to date.</p></li>
<li><p>You are responsible for all activity on your account. Do not share your OTP with anyone.</p></li>
</ul>
<h2>Listings</h2>
<ul>
<li><p>Product names, descriptions, images, prices, variants, and stock must be accurate and must not mislead customers.</p></li>
<li><p>You must own or have the right to sell every product you list, and the right to use every image you upload.</p></li>
<li><p>AI-suggested product details are provided for convenience. You are responsible for reviewing them before publishing.</p></li>
</ul>
<h2>In-Shop Sales</h2>
<p>Localo helps customers discover your shop. Purchases happen offline at your shop. You are solely responsible for pricing, billing, taxes, warranties, returns, and customer service for every sale.</p>
<h2>Working Hours</h2>
<p>You must keep your working hours and special hours accurate so customers do not visit when your shop is closed.</p>
<h2>Paid Features</h2>
<ul>
<li><p>Boosts and other paid features are billed in advance through our payment partner.</p></li>
<li><p>Refunds for cancelled boosts follow the policy shown at the time of purchase.</p></li>
</ul>
<h2>Prohibited Conduct</h2>
<ul>
<li><p>Listing counterfeit, illegal, restricted, or unsafe products.</p></li>
<li><p>Manipulating reviews, ratings, or wishlist counts.</p></li>
<li><p>Attempting to interfere with the security or normal operation of the Platform.</p></li>
</ul>
<h2>Suspension and Termination</h2>
<p>We may hide listings, suspend, or deactivate a seller account that breaks these Terms. You may request deletion of your account at any time from the app.</p>
<h2>Changes to These Terms</h2>
<p>We may update these Terms from time to time. Continued use of the Seller Platform after changes take effect means you accept the updated Terms.</p>
<h2>Contact Us</h2>
<p>If you have questions about these Terms, please contact our seller support team through the app.</p>`,
  },
];

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    for (const page of PAGES) {
      await queryInterface.sequelize.query(
        `INSERT INTO cms_pages (title, slug, content, audience, is_active, created_at, updated_at)
         SELECT :title, :slug, :content, 'seller', TRUE, NOW(), NOW()
         WHERE NOT EXISTS (SELECT 1 FROM cms_pages WHERE audience = 'seller' AND slug = :slug)`,
        {
          replacements: { title: page.title, slug: page.slug, content: page.content },
          transaction: t,
        },
      );
    }
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `DELETE FROM cms_pages WHERE audience = 'seller' AND slug IN (:slugs)`,
    { replacements: { slugs: PAGES.map(p => p.slug) } },
  );
}

export { up, down };
