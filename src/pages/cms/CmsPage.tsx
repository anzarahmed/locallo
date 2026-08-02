import { useEffect, useState, type JSX } from 'react';
import { AlertCircle } from 'lucide-react';
import { getCmsPageBySlug } from '../../services/cmsPageService';
import { ApiError } from '../../lib/axios';
import type { CmsPage as CmsPageData } from '../../types';

interface CmsPageProps {
  slug: string;
}

export default function CmsPage({ slug }: CmsPageProps): JSX.Element {
  const [page, setPage] = useState<CmsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCmsPageBySlug(slug)
      .then((r) => setPage(r.cmsPage))
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'Failed to load page.');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {loading && (
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-2/3 bg-gray-200 rounded" />
            <div className="h-4 w-full bg-gray-100 rounded" />
            <div className="h-4 w-full bg-gray-100 rounded" />
            <div className="h-4 w-5/6 bg-gray-100 rounded" />
          </div>
        )}

        {!loading && error && (
          <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && page && (
          <article className="prose prose-slate max-w-none">
            <h1>{page.title}</h1>
            <div dangerouslySetInnerHTML={{ __html: page.content }} />
          </article>
        )}
      </div>
    </div>
  );
}
