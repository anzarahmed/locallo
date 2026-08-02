import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import type { JSX } from 'react';

const CmsPage = lazy(() => import('./pages/cms/CmsPage'));
const Home = lazy(() => import('./pages/home/Home'));

const PageFallback = (): JSX.Element => <div className="min-h-screen bg-white" />;

function NotFound(): JSX.Element {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-gray-400 text-sm">Page not found</p>
    </div>
  );
}

function AppRoutes(): JSX.Element {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/privacy-policy" element={<CmsPage slug="privacy-policy" />} />
        <Route path="/terms-of-use"   element={<CmsPage slug="terms-of-use" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default function App(): JSX.Element {
  return (
    <BrowserRouter basename="/customer">
      <AppRoutes />
    </BrowserRouter>
  );
}
