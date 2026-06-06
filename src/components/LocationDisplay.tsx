import { useEffect, useState, type JSX } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from '@vis.gl/react-google-maps';
import { Loader2 } from 'lucide-react';

const API_KEY: string = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

interface LatLng {
  readonly lat: number;
  readonly lng: number;
}

export interface LocationDisplayProps {
  latitude: number;
  longitude: number;
  mapHeight?: string;
}

function MapController({ position }: { position: LatLng }): null {
  const map = useMap();
  useEffect((): void => {
    if (!map) return;
    map.panTo(position);
    if ((map.getZoom() ?? 0) < 14) map.setZoom(14);
  }, [map, position.lat, position.lng]);
  return null;
}

function MapContent({ latitude, longitude, mapHeight = 'h-64' }: LocationDisplayProps): JSX.Element {
  const position: LatLng = { lat: Number(latitude), lng: Number(longitude) };

  return (
    <div className={`rounded-xl overflow-hidden border border-gray-200 ${mapHeight}`}>
      <Map
        defaultCenter={position}
        defaultZoom={14}
        mapId="localo-seller-location-display"
        gestureHandling="none"
        disableDefaultUI
        className="h-full w-full"
      >
        <MapController position={position} />
        <AdvancedMarker position={position} />
      </Map>
    </div>
  );
}

export default function LocationDisplay({ latitude, longitude, mapHeight }: LocationDisplayProps): JSX.Element {
  const [apiReady, setApiReady] = useState<boolean>(false);
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!API_KEY || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return (
      <div
        className={`${mapHeight ?? 'h-64'} flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50`}
      >
        <p className="text-xs text-gray-400 text-center px-4">
          Map unavailable — set{' '}
          <code className="font-mono bg-gray-100 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code>
          {' '}in{' '}
          <code className="font-mono bg-gray-100 px-1 rounded">.env.local</code>
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} onLoad={(): void => setApiReady(true)}>
      {!apiReady ? (
        <div
          className={`${mapHeight ?? 'h-64'} flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50`}
        >
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
      ) : (
        <MapContent latitude={lat} longitude={lng} mapHeight={mapHeight} />
      )}
    </APIProvider>
  );
}
