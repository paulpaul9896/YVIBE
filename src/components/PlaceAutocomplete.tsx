import React, { useRef, useEffect } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Search } from 'lucide-react';

export type LocationBias = { lat: number; lng: number };

type PlaceAutocompleteProps = {
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
  onClear: () => void;
  hasValue: boolean;
  /** 以地圖中心為準，優先顯示附近地點 */
  locationBias?: LocationBias;
};

const DEFAULT_BIAS: LocationBias = { lat: 22.3193, lng: 114.1694 }; // Hong Kong
const BIAS_RADIUS_M = 50_000;
const BIAS_DEG = 0.35; // ~35km bounding box

function buildAutocompleteOptions(
  maps: typeof google.maps,
  bias: LocationBias,
): google.maps.places.AutocompleteOptions {
  const center = new maps.LatLng(bias.lat, bias.lng);
  const bounds = new maps.LatLngBounds(
    new maps.LatLng(bias.lat - BIAS_DEG, bias.lng - BIAS_DEG),
    new maps.LatLng(bias.lat + BIAS_DEG, bias.lng + BIAS_DEG),
  );

  return {
    fields: ['geometry', 'name', 'formatted_address', 'place_id'],
    bounds,
    strictBounds: false,
    location: center,
    radius: BIAS_RADIUS_M,
  };
}

export default function PlaceAutocomplete({
  onPlaceSelect,
  onClear,
  hasValue,
  locationBias,
}: PlaceAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const placesLib = useMapsLibrary('places');
  const bias = locationBias ?? DEFAULT_BIAS;

  // Create autocomplete once
  useEffect(() => {
    if (!placesLib || !inputRef.current) return;

    const options = buildAutocompleteOptions(google.maps, bias);
    const autocomplete = new placesLib.Autocomplete(inputRef.current, options);
    autocompleteRef.current = autocomplete;

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        onPlaceSelect(place);
      }
    });

    return () => {
      autocompleteRef.current = null;
      if (google.maps?.event && listener) {
        google.maps.event.removeListener(listener);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once; bias updates via setBounds
  }, [placesLib, onPlaceSelect]);

  // Re-bias when map moves
  useEffect(() => {
    const ac = autocompleteRef.current;
    if (!ac || !placesLib) return;

    const options = buildAutocompleteOptions(google.maps, bias);
    if (options.bounds) ac.setBounds(options.bounds);
  }, [bias.lat, bias.lng, placesLib]);

  useEffect(() => {
    if (!hasValue && inputRef.current) {
      inputRef.current.value = '';
    }
  }, [hasValue]);

  return (
    <div className="flex flex-1 items-center gap-4 min-w-0">
      <Search className="w-5 h-5 text-gray-400 shrink-0" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search nearby..."
        className="bg-transparent flex-1 min-w-0 outline-none text-sm font-bold placeholder:text-gray-300 pointer-events-auto"
        onChange={(e) => {
          if (e.target.value === '') onClear();
        }}
      />
      {hasValue && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (inputRef.current) inputRef.current.value = '';
            onClear();
          }}
          className="text-[9px] font-black uppercase text-blue-500 whitespace-nowrap bg-blue-50 px-3 py-2 rounded-full border border-blue-100 pointer-events-auto shrink-0"
        >
          Clear
        </button>
      )}
    </div>
  );
}
