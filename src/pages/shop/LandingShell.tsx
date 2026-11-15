import type { JSX, ReactNode } from 'react';
import { Heart, MapPin, Tag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import logo from '../../assets/logo.png';
import { APP_STORE_URL, PLAY_STORE_URL } from '../../lib/storeLinks';
import StoreButton from './StoreButton';
import StoreQrCode from './StoreQrCode';
import type { StoreKey } from './stores';

interface Benefit {
  icon: LucideIcon;
  text: string;
}

interface StoreLink {
  store: StoreKey;
  url: string;
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

const STORE_LINKS: StoreLink[] = [
  { store: 'android', url: PLAY_STORE_URL },
  { store: 'ios', url: APP_STORE_URL },
];

const SHOW_QR_CODES = Boolean(PLAY_STORE_URL || APP_STORE_URL);

export default function LandingShell({ icon: HeadingIcon, children }: LandingShellProps): JSX.Element {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-linear-to-br from-[#26B8B2] to-[#14817C] px-4 py-6 flex flex-col items-center justify-center">
      <div aria-hidden="true" className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10" />
      <div aria-hidden="true" className="absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-white/10" />

      <main className="relative w-full max-w-md rounded-3xl bg-white px-5 py-6 shadow-2xl sm:max-w-lg sm:px-8">
        <img src={logo} alt="Loccalo" className="mx-auto h-10 w-auto" />

        <div className="mt-4 text-center">
          <div className="mx-auto flex w-12 h-12 items-center justify-center rounded-full bg-[#26B8B2]/15 text-[#14817C]">
            <HeadingIcon className="w-6 h-6" />
          </div>
          {children}
        </div>

        <ul className="mt-5 grid grid-cols-3 gap-2">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex flex-col items-center gap-1.5 text-center text-xs text-gray-700">
              <span className="flex w-8 h-8 shrink-0 items-center justify-center rounded-full bg-[#26B8B2]/15 text-[#14817C]">
                <Icon className="w-4 h-4" />
              </span>
              {text}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center gap-3 text-xs font-medium text-gray-400">
          <span className="h-px flex-1 bg-gray-200" />
          <span className="sm:hidden">Download the free app</span>
          <span className="hidden sm:inline">{SHOW_QR_CODES ? 'Scan or tap to download the free app' : 'Download the free app'}</span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4">
          {STORE_LINKS.map(({ store, url }) => (
            <div key={store} className="flex flex-col gap-3">
              {SHOW_QR_CODES && (
                <div className="hidden sm:flex justify-center">
                  <StoreQrCode store={store} url={url} />
                </div>
              )}
              <StoreButton store={store} url={url} />
            </div>
          ))}
        </div>
      </main>

      <p className="relative mt-4 text-xs text-white/80">© Loccalo</p>
    </div>
  );
}
