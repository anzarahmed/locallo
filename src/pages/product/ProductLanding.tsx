import { useEffect, type JSX } from 'react';
import { Package } from 'lucide-react';
import LandingShell from '../shop/LandingShell';

export default function ProductLanding(): JSX.Element {
  useEffect(() => {
    document.title = 'Loccalo';
  }, []);

  return (
    <LandingShell icon={Package}>
      <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-gray-900">Discover this product on Loccalo</h1>
    </LandingShell>
  );
}
