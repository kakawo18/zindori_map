import { useEffect, useRef } from 'react';
import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { cellsToGeoJson } from '../core/h3cells';
import type { TrackPoint, TrackSegment } from '../core/types';

interface Props {
  /** 取得済み H3 セル。本人のみ閲覧可能な情報。 */
  ownedCells: string[];
  /** 記録中の軌跡（区間ごと）。 */
  segments: TrackSegment[];
  current: TrackPoint | null;
  /** 記録中は現在地に追従する。 */
  followCurrent: boolean;
}

const EMPTY_GEOJSON: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

/** 初期表示位置（東京駅）。現在地が取れ次第そちらへ移動する。 */
const FALLBACK_CENTER: [number, number] = [139.767, 35.681];

function segmentsToGeoJson(segments: TrackSegment[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: segments
      .filter((s) => s.length >= 2)
      .map((s) => ({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: s.map((p) => [p.lng, p.lat] as [number, number]),
        },
      })),
  };
}

export function MapView({ ownedCells, segments, current, followCurrent }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const loadedRef = useRef(false);
  const centeredRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: FALLBACK_CENTER,
      zoom: 16,
      attributionControl: { compact: true },
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            maxzoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
    });
    mapRef.current = map;

    map.on('load', () => {
      map.addSource('owned-cells', { type: 'geojson', data: EMPTY_GEOJSON });
      map.addLayer({
        id: 'owned-cells-fill',
        type: 'fill',
        source: 'owned-cells',
        paint: { 'fill-color': '#4ade80', 'fill-opacity': 0.35 },
      });
      map.addLayer({
        id: 'owned-cells-line',
        type: 'line',
        source: 'owned-cells',
        paint: { 'line-color': '#22c55e', 'line-width': 1 },
      });

      map.addSource('track', { type: 'geojson', data: EMPTY_GEOJSON });
      map.addLayer({
        id: 'track-line',
        type: 'line',
        source: 'track',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#f59e0b', 'line-width': 4 },
      });

      loadedRef.current = true;
    });

    return () => {
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
  }, []);

  // 取得済みセルの描画を更新する。
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const source = map.getSource('owned-cells') as maplibregl.GeoJSONSource | undefined;
    source?.setData(cellsToGeoJson(ownedCells));
  }, [ownedCells]);

  // 記録中の軌跡を更新する。
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const source = map.getSource('track') as maplibregl.GeoJSONSource | undefined;
    source?.setData(segmentsToGeoJson(segments));
  }, [segments]);

  // 現在地マーカーと追従。
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !current) return;

    if (!markerRef.current) {
      const el = document.createElement('div');
      el.className = 'current-marker';
      markerRef.current = new maplibregl.Marker({ element: el });
    }
    markerRef.current.setLngLat([current.lng, current.lat]).addTo(map);

    if (followCurrent || !centeredRef.current) {
      map.easeTo({ center: [current.lng, current.lat], duration: 500 });
      centeredRef.current = true;
    }
  }, [current, followCurrent]);

  return <div className="map" ref={containerRef} />;
}
