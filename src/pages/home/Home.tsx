import type { JSX } from 'react';

export default function Home(): JSX.Element {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-gray-600 text-lg">Welcome to Locallo</p>
    </div>
  );
}