import { useEffect, useState, type JSX } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, FileText } from 'lucide-react';
import { getCmsPages } from '../../services/cmsPageService';
import { useToast } from '../../hooks/useToast';
import type { CmsPageSummary } from '../../types';

function SkeletonLink(): JSX.Element {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
      <div className="h-3.5 w-40 bg-gray-100 rounded animate-pulse" />
    </div>
  );
}

export default function CmsPageLinks(): JSX.Element | null {
  const toast = useToast();
  const [pages, setPages] = useState<CmsPageSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCmsPages()
      .then((r) => setPages(r.cmsPages))
      .catch(() => toast.error('Failed to load legal pages'))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && pages.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-2">
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Legal</p>
      </div>
      <div className="divide-y divide-gray-50">
        {loading
          ? [0, 1].map((i) => <SkeletonLink key={i} />)
          : pages.map((p) => (
              <Link
                key={p.id}
                to={`/pages/${p.slug}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
                  <FileText size={17} className="text-teal-600" />
                </div>
                <p className="flex-1 min-w-0 text-sm font-medium text-gray-800 truncate">{p.title}</p>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </Link>
            ))}
      </div>
    </div>
  );
}
