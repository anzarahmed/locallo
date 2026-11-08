import type { JSX } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { STORES } from './stores';
import type { StoreKey } from './stores';

interface StoreQrCodeProps {
  store: StoreKey;
  url: string;
}

export default function StoreQrCode({ store, url }: StoreQrCodeProps): JSX.Element | null {
  if (!url) return null;
  const { label, iconPath } = STORES[store];

  return (
    <figure className="flex flex-col items-center gap-2">
      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <QRCodeSVG
          value={url}
          size={112}
          level="M"
          marginSize={0}
          role="img"
          aria-label={`Scan to download on ${label}`}
        />
      </div>
      <figcaption className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 fill-current" aria-hidden="true">
          <path d={iconPath} />
        </svg>
        {label}
      </figcaption>
    </figure>
  );
}
