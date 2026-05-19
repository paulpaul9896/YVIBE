import React, { useEffect, useState, useRef } from 'react';
import { useMap, AdvancedMarker } from '@vis.gl/react-google-maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import type { Marker } from '@googlemaps/markerclusterer';

interface ClusteredMarkersProps {
  markers: any[];
  selectedMarker: any | null;
  onMarkerClick: (marker: any) => void;
  MarkerHtmlContent: React.ComponentType<{ m: any, isSelected: boolean }>;
}

export default function ClusteredMarkers({ markers, selectedMarker, onMarkerClick, MarkerHtmlContent }: ClusteredMarkersProps) {
  const map = useMap();
  const [markersObj, setMarkersObj] = useState<{[key: string]: Marker}>({});
  const clusterer = useRef<MarkerClusterer | null>(null);

  useEffect(() => {
    if (!map) return;
    if (!clusterer.current) {
      clusterer.current = new MarkerClusterer({ map });
    }
  }, [map]);

  useEffect(() => {
    clusterer.current?.clearMarkers();
    clusterer.current?.addMarkers(Object.values(markersObj));
  }, [markersObj]);

  const setMarkerRef = (marker: Marker | null, key: string) => {
    if (marker && markersObj[key]) return;
    if (!marker && !markersObj[key]) return;
    
    setMarkersObj(prev => {
      if (marker) {
        return {...prev, [key]: marker};
      } else {
        const newObj = {...prev};
        delete newObj[key];
        return newObj;
      }
    });
  };

  return (
    <>
      {markers.map(m => (
        <AdvancedMarker
          key={m.id}
          position={{ lat: m.lat, lng: m.lng }}
          onClick={() => onMarkerClick(m)}
          ref={(marker) => setMarkerRef(marker as Marker, m.id)}
          style={{zIndex: selectedMarker?.id === m.id ? 100 : 1}}
        >
          <MarkerHtmlContent m={m} isSelected={selectedMarker?.id === m.id} />
        </AdvancedMarker>
      ))}
    </>
  );
}
