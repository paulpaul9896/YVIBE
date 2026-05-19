import React, { useRef, useEffect } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Search } from 'lucide-react';

export default function PlaceAutocomplete({ onPlaceSelect, onClear, hasValue }: { onPlaceSelect: (place: any) => void, onClear: () => void, hasValue: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const placesLib = useMapsLibrary('places');

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;
    
    const options = {
      fields: ['geometry', 'name', 'formatted_address']
    };

    const autocomplete = new placesLib.Autocomplete(inputRef.current, options);

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        onPlaceSelect(place);
      }
    });

    return () => {
      // @ts-ignore
      if (google && google.maps && google.maps.event && listener) {
        google.maps.event.removeListener(listener);
      }
    }
  }, [placesLib, onPlaceSelect]);

  useEffect(() => {
    if (!hasValue && inputRef.current) {
      inputRef.current.value = '';
    }
  }, [hasValue]);

  return (
    <div className="flex flex-1 items-center gap-4">
      <Search className="w-5 h-5 text-gray-400 shrink-0" />
      <input 
        ref={inputRef}
        type="text"
        placeholder="Search locations..."
        className="bg-transparent w-[140px] md:w-full outline-none text-sm font-bold placeholder:text-gray-300 pointer-events-auto" 
        onChange={(e) => {
          if (e.target.value === '') {
            onClear();
          }
        }}
      />
      {hasValue && (
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            if (inputRef.current) inputRef.current.value = '';
            onClear(); 
          }}
          className="text-[9px] font-black uppercase text-blue-500 whitespace-nowrap bg-blue-50 px-3 py-2 rounded-full border border-blue-100 pointer-events-auto"
        >
          Clear
        </button>
      )}
    </div>
  );
}
