import type { QueryInterface } from 'sequelize';

interface CmsPageSeed {
  title: string;
  slug: string;
  content: string;
}

const PAGES: CmsPageSeed[] = [
  {
    title: 'Privacy Policy',
    slug: 'privacy-policy',
    content: `<h1>Privacy Policy</h1>
<p>This Privacy Policy explains how Localo ("we", "us", "our") collects, uses and protects information when you use our Seller app, Customer app, or related services (together, the "Platform").</p>
<h2>Information We Collect</h2>
<ul>
<li><p><strong>Account information</strong>: mobile number, name, email, and business details for sellers.</p></li>
<li><p><strong>Location data</strong>: shop address and coordinates for sellers; approximate location for customers to discover nearby shops.</p></li>
<li><p><strong>Product and order information</strong>: listings, images, prices, and wishlist activity.</p></li>
<li><p><strong>Device information</strong>: device ID and device type, used to secure your login session.</p></li>
</ul>
<h2>How We Use Your Information</h2>
<ul>
<li><p>To verify your identity via OTP and keep your account secure.</p></li>
<li><p>To connect customers with nearby sellers and display relevant products.</p></li>
<li><p>To operate core features such as wishlists, product listings, and shop profiles.</p></li>
<li><p>To send notifications you have opted into, such as order or wishlist updates.</p></li>
</ul>
<h2>How We Protect Your Information</h2>
<p>Product and profile images are stored securely and only ever shared via time-limited signed URLs. We do not sell your personal information to third parties.</p>
<h2>Your Choices</h2>
<p>You can update your profile information at any time from the app, and control notification preferences from your Settings page.</p>
<h2>Contact Us</h2>
<p>If you have questions about this Privacy Policy, please contact our support team through the app.</p>`,
  },
  {
    title: 'Terms of Use',
    slug: 'terms-of-use',
    content: `<h1>Terms of Use</h1>
<p>These Terms of Use ("Terms") govern your access to and use of Localo's Seller app, Customer app, and related services (together, the "Platform"). By using the Platform, you agree to these Terms.</p>
<h2>Accounts</h2>
<ul>
<li><p>Sellers are onboarded and verified by the Localo team before their shop becomes visible to customers.</p></li>
<li><p>Customers and sellers log in using their mobile number and a one-time password (OTP). You are responsible for keeping your account access secure.</p></li>
</ul>
<h2>Seller Responsibilities</h2>
<ul>
<li><p>Sellers must provide accurate product information, including pricing, stock, and images.</p></li>
<li><p>Sellers are responsible for fulfilling orders and maintaining accurate working hours and availability.</p></li>
</ul>
<h2>Customer Responsibilities</h2>
<p>Customers agree to use the Platform only for its intended purpose of discovering and purchasing from local sellers, and to provide accurate information when creating an account.</p>
<h2>Prohibited Conduct</h2>
<ul>
<li><p>Listing counterfeit, illegal, or misleading products.</p></li>
<li><p>Attempting to interfere with the security or normal operation of the Platform.</p></li>
</ul>
<h2>Changes to the Platform</h2>
<p>We may update, suspend, or discontinue parts of the Platform at any time, and may update these Terms from time to time. Continued use of the Platform after changes take effect constitutes acceptance of the updated Terms.</p>
<h2>Contact Us</h2>
<p>If you have questions about these Terms, please contact our support team through the app.</p>`,
  },
];

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    for (const page of PAGES) {
      await queryInterface.sequelize.query(
        `INSERT INTO cms_pages (title, slug, content, is_active, created_at, updated_at)
         SELECT :title, :slug, :content, TRUE, NOW(), NOW()
         WHERE NOT EXISTS (SELECT 1 FROM cms_pages WHERE slug = :slug)`,
        {
          replacements: { title: page.title, slug: page.slug, content: page.content },
          transaction: t,
        },
      );
    }
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    const slugList = PAGES.map(p => `'${p.slug}'`).join(', ');
    await queryInterface.sequelize.query(
      `DELETE FROM cms_pages WHERE slug IN (${slugList})`,
      { transaction: t },
    );
  });
}

export { up, down };
