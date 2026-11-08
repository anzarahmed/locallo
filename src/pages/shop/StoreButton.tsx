import type { JSX } from 'react';
import { STORES } from './stores';
import type { StoreKey } from './stores';

interface StoreButtonProps {
  store: StoreKey;
  url: string;
}

export default function StoreButton({ store, url }: StoreButtonProps): JSX.Element {
  const { label, prefix, iconPath } = STORES[store];
  const content = (
    <>
      <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0 fill-current" aria-hidden="true">
        <path d={iconPath} />
      </svg>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-[11px] opacity-80">{url ? prefix : 'Coming soon on'}</span>
        <span className="text-base font-semibold">{label}</span>
      </span>
    </>
  );

  if (!url) {
    return (
      <div
        aria-disabled="true"
        className="flex items-center justify-center gap-3 rounded-2xl bg-gray-100 px-5 py-3 text-gray-400"
      >
        {content}
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-3 rounded-2xl bg-gray-900 px-5 py-3 text-white shadow-md transition hover:-translate-y-0.5 hover:bg-gray-800 hover:shadow-lg"
    >
      {content}
    </a>
  );
}
