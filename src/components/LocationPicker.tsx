import { useEffect, useRef, useState, useCallback, type JSX } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMapsLibrary,
  useMap,
} from '@vis.gl/react-google-maps';
import { MapPin, Loader2 } from 'lucide-react';

const API_KEY: string = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

interface LatLng {
  readonly lat: number;
  readonly lng: number;
}

const DEFAULT_CENTER: LatLng = { lat: 20.5937, lng: 78.9629 };
const DEFAULT_ZOOM = 5;

export interface LocationPickerProps {
  latitude: number | undefined;
  longitude: number | undefined;
  onChange: (lat: number, lng: number) => void;
}

// ── Places Autocomplete input ─────────────────────────────────────────────────

interface AutocompleteInputProps {
  onPlace: (pos: LatLng) => void;
}

function AutocompleteInput({ onPlace }: AutocompleteInputProps): JSX.Element {
  const placesLib = useMapsLibrary('places');
  const inputRef = useRef<HTMLInputElement>(null);
  const acRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect((): (() => void) | undefined => {
    if (!placesLib || !inputRef.current) return undefined;

    acRef.current = new placesLib.Autocomplete(inputRef.current, {
      fields: ['geometry', 'formatted_address'],
    });

    const listener = acRef.current.addListener('place_changed', (): void => {
      const place = acRef.current?.getPlace();
      const loc = place?.geometry?.location;
      if (!loc) return;
      onPlace({ lat: loc.lat(), lng: loc.lng() });
      if (inputRef.current) {
        inputRef.current.value = place?.formatted_address ?? '';
      }
    });

    return (): void => {
      google.maps.event.removeListener(listener);
    };
  }, [placesLib, onPlace]);

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search address or place..."
        aria-label="Search address"
        className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
    </div>
  );
}

// ── Pan map when position changes externally ──────────────────────────────────

function MapController({ position }: { position: LatLng | null }): null {
  const map = useMap();
  useEffect((): void => {
    if (!map || !position) return;
    map.panTo(position);
    if ((map.getZoom() ?? 0) < 14) map.setZoom(14);
  }, [map, position]);
  return null;
}

// ── Inner map content ─────────────────────────────────────────────────────────

function MapContent({ latitude, longitude, onChange }: LocationPickerProps): JSX.Element {
  const hasPin = latitude != null && longitude != null;
  const pinPos: LatLng | null = hasPin
    ? { lat: latitude, lng: longitude }
    : null;

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent): void => {
      if (!e.latLng) return;
      onChange(e.latLng.lat(), e.latLng.lng());
    },
    [onChange],
  );

  const handleDragEnd = useCallback(
    (e: google.maps.MapMouseEvent): void => {
      if (!e.latLng) return;
      onChange(e.latLng.lat(), e.latLng.lng());
    },
    [onChange],
  );

  return (
    <div className="space-y-3">
      <AutocompleteInput onPlace={(p: LatLng): void => onChange(p.lat, p.lng)} />

      <div className="rounded-xl overflow-hidden border border-gray-200 h-72 relative">
        <Map
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          mapId="localo-seller-map"
          onClick={handleMapClick}
          gestureHandling="greedy"
          className="h-full w-full"
        >
          <MapController position={pinPos} />
          {pinPos !== null && (
            <AdvancedMarker
              position={pinPos}
              draggable
              onDragEnd={handleDragEnd}
              title="Drag to adjust location"
            />
          )}
        </Map>

        {!hasPin && (
          <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-4">
            <span className="bg-white/90 backdrop-blur-sm text-xs text-gray-500 px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
              Click map or search an address to drop a pin
            </span>
          </div>
        )}
      </div>

      {/* Manual coordinate inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Latitude</label>
          <input
            type="number"
            step="any"
            value={latitude ?? ''}
            onChange={(e): void => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) onChange(v, longitude ?? DEFAULT_CENTER.lng);
            }}
            placeholder="e.g. 28.6139"
            aria-label="Latitude"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Longitude</label>
          <input
            type="number"
            step="any"
            value={longitude ?? ''}
            onChange={(e): void => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) onChange(latitude ?? DEFAULT_CENTER.lat, v);
            }}
            placeholder="e.g. 77.2090"
            aria-label="Longitude"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {latitude != null && longitude != null && (
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          Pinned at {latitude.toFixed(6)}, {longitude.toFixed(6)} — drag the marker to adjust
        </p>
      )}
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export default function LocationPicker(props: LocationPickerProps): JSX.Element {
  const [apiReady, setApiReady] = useState<boolean>(false);

  if (!API_KEY) {
    return (
      <div className="h-40 flex items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50">
        <p className="text-sm text-gray-400">
          Set{' '}
          <code className="font-mono bg-gray-100 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code>
          {' '}in{' '}
          <code className="font-mono bg-gray-100 px-1 rounded">.env.local</code>
        </p>
      </div>
    );
  }

  return (
    <APIProvider
      apiKey={API_KEY}
      libraries={['places']}
      onLoad={(): void => setApiReady(true)}
    >
      {!apiReady ? (
        <div className="h-72 flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
      ) : (
        <MapContent {...props} />
      )}
    </APIProvider>
  );
}
