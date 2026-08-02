import type { QueryInterface } from 'sequelize';

interface FaqSeed {
  question: string;
  answer: string;
}

const FAQS: FaqSeed[] = [
  {
    question: 'What is Localo?',
    answer: 'Localo is a local e-commerce platform that connects nearby sellers with customers. Sellers list their products through the Seller app, and customers browse and discover shops through the Customer app.',
  },
  {
    question: 'How do I register as a seller on Localo?',
    answer: 'Seller accounts are created by the Localo admin team. Once your account is created, you can log in to the Seller Panel with your registered mobile number and verify it with an OTP.',
  },
  {
    question: 'How do I log in without a password?',
    answer: 'Sellers and customers log in using their mobile number. Enter your number and country code, and we\'ll send a 4-digit OTP to verify it — no password required.',
  },
  {
    question: 'How do I add a product to my shop?',
    answer: 'From the Seller Panel, go to Products and tap "Add Product". Upload a photo first — our AI will suggest a name, description, category and attributes automatically, which you can review and edit before saving.',
  },
  {
    question: 'Can I sell products with different variants like size or color?',
    answer: 'Yes. Open a product and go to its Variants section to add variations such as size or color, each with its own price, stock and images. Your product\'s total stock automatically stays in sync with its variants.',
  },
  {
    question: 'How do I set my shop\'s working hours?',
    answer: 'Go to Profile in the Seller Panel and set opening and closing times for each day of the week. You can mark any day as closed, and copy hours from one day to another to save time.',
  },
  {
    question: 'What if I need different hours for a single day, like a holiday?',
    answer: 'Use the Special Hours option on your Profile page to set a one-off override for a specific date without changing your regular weekly schedule. It automatically reverts once that date has passed.',
  },
  {
    question: 'How do customers save products they like?',
    answer: 'Customers can tap the wishlist icon on any product to save it for later. Saved products are available anytime from the Wishlist section of the Customer app.',
  },
  {
    question: 'How are sellers verified on Localo?',
    answer: 'The Localo admin team reviews and verifies each seller\'s details before their shop becomes visible to customers, helping keep the marketplace trustworthy.',
  },
  {
    question: 'I\'m an admin and forgot my password. What should I do?',
    answer: 'On the Admin Panel login screen, click "Forgot Password" and enter your registered email. We\'ll send you a secure link to reset your password, valid for 1 hour.',
  },
];

async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    for (const faq of FAQS) {
      await queryInterface.sequelize.query(
        `INSERT INTO faqs (question, answer, is_active, created_at, updated_at)
         SELECT :question, :answer, TRUE, NOW(), NOW()
         WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = :question)`,
        {
          replacements: { question: faq.question, answer: faq.answer },
          transaction: t,
        },
      );
    }
  });
}

async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.transaction(async (t) => {
    const questionList = FAQS.map(f => f.question.replace(/'/g, "''")).map(q => `'${q}'`).join(', ');
    await queryInterface.sequelize.query(
      `DELETE FROM faqs WHERE question IN (${questionList})`,
      { transaction: t },
    );
  });
}

export { up, down };
