import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import LockedYouTubePlayer from '../../components/upload-guide/LockedYouTubePlayer';

const VIDEO_ID = 'RFGlNe-uv3s';
const TITLE = 'Product Upload Guide';

export default function ProductUploadGuide(): JSX.Element {
  const navigate = useNavigate();
  const { token } = useAuth();

  function handleBack(): void {
    // Opened from an email there is no in-app history to go back to.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(token ? '/products/add' : '/login', { replace: true });
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
          <h1 className="text-2xl font-bold text-white">{TITLE}</h1>
          <p className="text-teal-100 text-sm mt-1">
            Watch this short video to learn how to add products to your Loccalo store.
          </p>
        </div>
      </div>

      <div className="px-4 md:px-8 -mt-4 pb-10 max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-3 md:p-5">
          <LockedYouTubePlayer videoId={VIDEO_ID} title={TITLE} />
        </div>
      </div>
    </div>
  );
}
