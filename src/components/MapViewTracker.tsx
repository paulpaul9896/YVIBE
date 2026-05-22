import { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import type { LocationBias } from './PlaceAutocomplete';

/** 追蹤地圖中心，供搜尋 autocomplete 做 location bias */
export default function MapViewTracker({ onCenterChange }: { onCenterChange: (center: LocationBias) => void }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const update = () => {
      const c = map.getCenter();
      if (c) onCenterChange({ lat: c.lat(), lng: c.lng() });
    };

    update();
    const idle = map.addListener('idle', update);
    return () => {
      if (google.maps?.event) google.maps.event.removeListener(idle);
    };
  }, [map, onCenterChange]);

  return null;
}
