import { useEffect, useState, type JSX } from 'react';
import { getCmsPageBySlug } from '../../services/cmsPageService';
import { ApiError } from '../../lib/axios';
import type { CmsPage as CmsPageData } from '../../types';
import { formatDate } from '../../lib/dateFormat';

const CONTENT_CLASSES = [
  'text-sm leading-relaxed text-gray-700',
  '[&_h1]:hidden',
  '[&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:mt-6 [&_h2]:mb-2',
  '[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-4 [&_h3]:mb-1.5',
  '[&_p]:my-2',
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2',
  '[&_li]:my-1 [&_li>p]:my-0',
  '[&_a]:text-teal-600 [&_a]:underline',
  '[&_strong]:font-semibold [&_strong]:text-gray-900',
].join(' ');

function ContentSkeleton(): JSX.Element {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-5 w-1/2 bg-gray-200 rounded" />
      <div className="h-3 w-1/3 bg-gray-100 rounded mb-4" />
      <div className="h-3 w-full bg-gray-100 rounded" />
      <div className="h-3 w-full bg-gray-100 rounded" />
      <div className="h-3 w-5/6 bg-gray-100 rounded" />
      <div className="h-4 w-1/4 bg-gray-200 rounded mt-6" />
      <div className="h-3 w-full bg-gray-100 rounded" />
      <div className="h-3 w-2/3 bg-gray-100 rounded" />
    </div>
  );
}

interface CmsStandalonePageProps {
  slug: string;
}

export default function CmsStandalonePage({ slug }: CmsStandalonePageProps): JSX.Element {
  const [page, setPage] = useState<CmsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCmsPageBySlug(slug)
      .then((r) => setPage(r.cmsPage))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err instanceof ApiError ? err.message : 'Failed to load page.');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div className="min-h-screen bg-white px-5 py-6">
      <div className="max-w-2xl mx-auto">
        {loading && <ContentSkeleton />}

        {!loading && notFound && <p className="text-sm text-gray-500">This page isn't available right now.</p>}

        {!loading && error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && page && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-1">{page.title}</h1>
            <p className="text-xs text-gray-400 mb-4">Last updated {formatDate(page.updatedAt)}</p>
            <article className={CONTENT_CLASSES} dangerouslySetInnerHTML={{ __html: page.content }} />
          </>
        )}
      </div>
    </div>
  );
}
