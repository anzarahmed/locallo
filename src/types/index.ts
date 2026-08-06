export interface CmsPage {
  id: number;
  title: string;
  slug: string;
  content: string;
  isActive: boolean;
}

export interface Faq {
  id: number;
  question: string;
  answer: string;
  isActive: boolean;
}
