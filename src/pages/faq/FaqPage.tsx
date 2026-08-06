import { useEffect, useMemo, useState, type JSX } from 'react';
import { AlertCircle, ChevronDown, HelpCircle, Search, X } from 'lucide-react';
import { getFaqs } from '../../services/faqService';
import { ApiError } from '../../lib/axios';
import type { Faq } from '../../types';

interface AccordionItemProps {
  faq: Faq;
  isOpen: boolean;
  onToggle: () => void;
}

function AccordionItem({ faq, isOpen, onToggle }: AccordionItemProps): JSX.Element {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden transition-colors hover:border-teal-200">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer"
      >
        <span className="text-sm sm:text-base font-medium text-gray-900">{faq.question}</span>
        <ChevronDown
          className={`w-5 h-5 shrink-0 text-teal-600 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-4 text-sm text-gray-600 leading-relaxed whitespace-pre-line">{faq.answer}</p>
        </div>
      </div>
    </div>
  );
}

function FaqSkeleton(): JSX.Element {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-16 rounded-2xl border border-gray-200 bg-white animate-pulse px-5 py-4">
          <div className="h-4 w-2/3 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function FaqPage(): JSX.Element {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    getFaqs()
      .then((r) => {
        setFaqs(r.faqs);
        setOpenId(r.faqs[0]?.id ?? null);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'Failed to load FAQs.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredFaqs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter(
      (faq) => faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q),
    );
  }, [faqs, query]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-teal-600 to-teal-800 px-6 pt-14 pb-20 text-center text-white">
        <div className="mx-auto flex w-fit items-center justify-center rounded-full bg-white/15 p-3">
          <HelpCircle className="w-7 h-7" />
        </div>
        <h1 className="mt-4 text-2xl sm:text-3xl font-semibold">Frequently Asked Questions</h1>
        <p className="mt-2 text-sm sm:text-base text-teal-50/90 max-w-md mx-auto">
          Answers to common questions about buying, selling and using Localo.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-6 -mt-10 pb-16">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions..."
            className="w-full rounded-xl border border-gray-200 bg-white pl-11 pr-10 py-3 text-sm shadow-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="mt-6">
          {loading && <FaqSkeleton />}

          {!loading && error && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && filteredFaqs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">No questions match "{query}".</p>
            </div>
          )}

          {!loading && !error && filteredFaqs.length > 0 && (
            <div className="space-y-3">
              {filteredFaqs.map((faq) => (
                <AccordionItem
                  key={faq.id}
                  faq={faq}
                  isOpen={openId === faq.id}
                  onToggle={() => setOpenId((prev) => (prev === faq.id ? null : faq.id))}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
