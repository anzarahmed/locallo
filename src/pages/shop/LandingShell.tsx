import type { JSX, ReactNode } from 'react';
import { Heart, MapPin, Tag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import logo from '../../assets/logo.png';
import { APP_STORE_URL, PLAY_STORE_URL } from '../../lib/storeLinks';
import StoreButton from './StoreButton';
import StoreQrCode from './StoreQrCode';

interface Benefit {
  icon: LucideIcon;
  text: string;
}

interface LandingShellProps {
  icon: LucideIcon;
  children: ReactNode;
}

const BENEFITS: Benefit[] = [
  { icon: MapPin, text: 'Discover local shops near you' },
  { icon: Tag, text: 'Get exclusive offers' },
  { icon: Heart, text: 'Save your favourites' },
];

export default function LandingShell({ icon: HeadingIcon, children }: LandingShellProps): JSX.Element {
  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-[#26B8B2] to-[#14817C] px-4 py-8 flex flex-col items-center justify-center">
      <div aria-hidden="true" className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10" />
      <div aria-hidden="true" className="absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-white/10" />

      <main className="relative w-full max-w-md rounded-3xl bg-white px-6 py-8 shadow-2xl sm:px-8">
        <img src={logo} alt="Loccalo" className="mx-auto h-12 w-auto" />

        <div className="mt-6 text-center">
          <div className="mx-auto flex w-14 h-14 items-center justify-center rounded-full bg-[#26B8B2]/15 text-[#14817C]">
            <HeadingIcon className="w-7 h-7" />
          </div>
          {children}
        </div>

        <ul className="mt-6 space-y-3">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm text-gray-700">
              <span className="flex w-8 h-8 shrink-0 items-center justify-center rounded-full bg-[#26B8B2]/15 text-[#14817C]">
                <Icon className="w-4 h-4" />
              </span>
              {text}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center gap-3 text-xs font-medium text-gray-400">
          <span className="h-px flex-1 bg-gray-200" />
          Download the free app
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="mt-4 space-y-3">
          <StoreButton store="android" url={PLAY_STORE_URL} />
          <StoreButton store="ios" url={APP_STORE_URL} />
        </div>

        {(PLAY_STORE_URL || APP_STORE_URL) && (
          <div className="hidden sm:block">
            <div className="mt-6 flex items-center gap-3 text-xs font-medium text-gray-400">
              <span className="h-px flex-1 bg-gray-200" />
              Or scan to download
              <span className="h-px flex-1 bg-gray-200" />
            </div>
            <div className="mt-4 flex justify-center gap-6">
              <StoreQrCode store="android" url={PLAY_STORE_URL} />
              <StoreQrCode store="ios" url={APP_STORE_URL} />
            </div>
          </div>
        )}
      </main>

      <p className="relative mt-6 text-xs text-white/80">© Loccalo</p>
    </div>
  );
}
