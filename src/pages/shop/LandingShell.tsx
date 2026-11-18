import type { JSX, ReactNode } from 'react';
import { Heart, MapPin, Tag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import logo from '../../assets/logo.png';
import { APP_STORE_URL, PLAY_STORE_URL } from '../../lib/storeLinks';
import StoreButton from './StoreButton';
import StoreQrCode from './StoreQrCode';
import { STORES } from './stores';
import type { StoreKey } from './stores';

interface Benefit {
  icon: LucideIcon;
  title: string;
  description: string;
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
  { icon: MapPin, title: 'Explore Nearby', description: 'Discover local stores around you' },
  { icon: Tag, title: 'Exclusive Offers', description: 'Enjoy special deals and discounts' },
  { icon: Heart, title: 'Save Favourites', description: 'Save stores and products you love' },
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
          {BENEFITS.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex flex-col items-center gap-1.5 text-center">
              <span className="flex w-8 h-8 shrink-0 items-center justify-center rounded-full bg-[#26B8B2]/15 text-[#14817C]">
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-sm font-semibold text-gray-900">{title}</span>
              <span className="text-xs text-gray-500">{description}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center gap-3 text-xs font-medium text-gray-400">
          <span className="h-px flex-1 bg-gray-200" />
          <span>Download the Loccalo app to get started</span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4">
          {STORE_LINKS.map(({ store, url }) => (
            <div key={store} className="flex flex-col gap-3">
              {SHOW_QR_CODES && (
                <div className="hidden sm:flex flex-col items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{STORES[store].platformLabel}</span>
                  <StoreQrCode store={store} url={url} />
                  {url && <span className="text-xs text-gray-500">Scan to download</span>}
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
