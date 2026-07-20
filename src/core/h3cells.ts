import { cellArea, cellToBoundary, latLngToCell, polygonToCells, UNITS } from 'h3-js';
import { CONFIG } from '../config';
import type { TrackPoint } from './types';

/**
 * ポリゴンが覆う H3 セルを返す。
 * 「新規エリア取得」「面積ポイント加算」の判定は、すべてこのセル単位の
 * 未取得→取得済み遷移で管理する（同じセルを再度歩いても加算されない）。
 */
export function polygonToCellIds(
  polygon: readonly TrackPoint[],
  resolution: number = CONFIG.h3Resolution,
): string[] {
  if (polygon.length < 3) return [];

  const ring = polygon.map((p) => [p.lat, p.lng] as [number, number]);
  const cells = polygonToCells([ring], resolution, false);

  // セル中心をひとつも含まない極小ポリゴンは空配列になる。
  // 「歩いたのに 1 セルも取れない」を避けるため、重心のセルを最低 1 つ割り当てる。
  if (cells.length === 0) {
    const lat = polygon.reduce((s, p) => s + p.lat, 0) / polygon.length;
    const lng = polygon.reduce((s, p) => s + p.lng, 0) / polygon.length;
    return [latLngToCell(lat, lng, resolution)];
  }
  return cells;
}

/** セル群の合計面積(m²)。 */
export function cellsAreaSquareMeters(cells: readonly string[]): number {
  return cells.reduce((sum, cell) => sum + cellArea(cell, UNITS.m2), 0);
}

/** セル境界を GeoJSON 用の [lng, lat] リングに変換する。 */
export function cellToRing(cell: string): [number, number][] {
  // formatAsGeoJson = true で [lng, lat] 順かつ閉じたリングが返る。
  return cellToBoundary(cell, true) as [number, number][];
}

/** セル群を MapLibre に渡す GeoJSON FeatureCollection にする。 */
export function cellsToGeoJson(cells: readonly string[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: cells.map((cell) => ({
      type: 'Feature',
      properties: { cell },
      geometry: { type: 'Polygon', coordinates: [cellToRing(cell)] },
    })),
  };
}
