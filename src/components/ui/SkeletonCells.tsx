import type { JSX } from 'react';

export function SkeletonAvatarCell(): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
      <div className="space-y-1.5">
        <div className="h-3.5 bg-gray-200 rounded w-28" />
        <div className="h-3 bg-gray-200 rounded w-20" />
      </div>
    </div>
  );
}

export function SkeletonNameBadgeCell(): JSX.Element {
  return (
    <div className="space-y-1.5">
      <div className="h-3.5 bg-gray-200 rounded w-32" />
      <div className="h-4 bg-gray-200 rounded-full w-16" />
    </div>
  );
}

export function SkeletonThumbnailCell(): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-gray-200 shrink-0" />
      <div className="h-3.5 bg-gray-200 rounded w-36" />
    </div>
  );
}

export function SkeletonPriceCell(): JSX.Element {
  return (
    <div className="flex flex-col items-end space-y-1.5">
      <div className="h-3.5 bg-gray-200 rounded w-16" />
      <div className="h-3 bg-gray-200 rounded w-12" />
    </div>
  );
}
