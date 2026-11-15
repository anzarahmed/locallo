import type { JSX } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { STORES } from './stores';
import type { StoreKey } from './stores';

interface StoreQrCodeProps {
  store: StoreKey;
  url: string;
}

export default function StoreQrCode({ store, url }: StoreQrCodeProps): JSX.Element {
  if (!url) {
    return (
      <div className="flex w-31 h-31 items-center justify-center rounded-2xl border border-dashed border-gray-200 text-xs font-medium text-gray-400">
        Coming soon
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-2.5 shadow-sm">
      <QRCodeSVG
        value={url}
        size={102}
        level="M"
        marginSize={0}
        role="img"
        aria-label={`Scan to download on ${STORES[store].label}`}
      />
    </div>
  );
}
