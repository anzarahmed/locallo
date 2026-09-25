import { useEffect, useState, type JSX } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { getCmsPageBySlug } from '../../services/cmsPageService';
import { ApiError } from '../../lib/axios';
import type { CmsPage as CmsPageData } from '../../types';
import { formatDate } from '../../lib/dateFormat';

const CONTENT_CLASSES = [
  'text-sm leading-relaxed text-gray-700',
  // The page title is already in the header; admin-authored content usually repeats it as an <h1>.
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
      <div className="h-4 w-1/3 bg-gray-200 rounded" />
      <div className="h-3 w-full bg-gray-100 rounded" />
      <div className="h-3 w-full bg-gray-100 rounded" />
      <div className="h-3 w-5/6 bg-gray-100 rounded" />
      <div className="h-4 w-1/4 bg-gray-200 rounded mt-6" />
      <div className="h-3 w-full bg-gray-100 rounded" />
      <div className="h-3 w-2/3 bg-gray-100 rounded" />
    </div>
  );
}

interface CmsPageViewProps {
  slug: string;
}

function CmsPageView({ slug }: CmsPageViewProps): JSX.Element {
  const navigate = useNavigate();
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

  function handleBack(): void {
    if (window.history.length > 1) navigate(-1);
    else navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div
        className="px-5 md:px-8 pt-8 pb-10"
        style={{ background: 'linear-gradient(135deg, #26B8B2 0%, #14817C 100%)' }}
      >
        <div className="max-w-3xl mx-auto">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm text-white/85 hover:text-white mb-4"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          {loading ? (
            <div className="h-7 w-2/3 bg-white/25 rounded animate-pulse" />
          ) : (
            <h1 className="text-2xl font-bold text-white">{page?.title ?? 'Page not available'}</h1>
          )}
          {page && !loading && (
            <p className="text-teal-100 text-sm mt-1">Last updated {formatDate(page.updatedAt)}</p>
          )}
        </div>
      </div>

      <div className="px-4 md:px-8 -mt-4 pb-10 max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-5 md:p-8">
          {loading && <ContentSkeleton />}

          {!loading && notFound && (
            <div className="flex flex-col items-center text-center py-10">
              <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mb-3">
                <FileText size={22} className="text-teal-600" />
              </div>
              <p className="text-sm font-medium text-gray-800">This page isn't available right now</p>
              <p className="text-xs text-gray-400 mt-1">Please check back later.</p>
            </div>
          )}

          {!loading && error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && page && (
            <article className={CONTENT_CLASSES} dangerouslySetInnerHTML={{ __html: page.content }} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function CmsPage(): JSX.Element {
  const { slug = '' } = useParams<{ slug: string }>();
  return <CmsPageView key={slug} slug={slug} />;
}
