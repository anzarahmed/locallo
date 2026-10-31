import { useEffect, type JSX } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Store } from 'lucide-react';
import LandingShell from './LandingShell';

export default function ShopLanding(): JSX.Element {
  const [searchParams] = useSearchParams();
  const shopName = searchParams.get('title')?.trim();

  useEffect(() => {
    document.title = shopName ? `${shopName} on Loccalo` : 'Loccalo';
  }, [shopName]);

  return (
    <LandingShell icon={Store}>
      {shopName ? (
        <>
          <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-[#14817C]">
            You're invited to visit
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900 wrap-break-word">{shopName}</h1>
          <p className="mt-2 text-gray-500">See this shop on the Loccalo app</p>
        </>
      ) : (
        <h1 className="mt-4 text-3xl font-bold text-gray-900">Discover this shop on Loccalo</h1>
      )}
    </LandingShell>
  );
}
