import type { TrackPoint } from './types';

const EARTH_RADIUS_M = 6371008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** 2 点間の大円距離(m)。 */
export function haversineMeters(a: TrackPoint, b: TrackPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 点列の総距離(m)。 */
export function pathLengthMeters(points: readonly TrackPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineMeters(points[i - 1], points[i]);
  return total;
}

export interface PlanarPoint {
  x: number;
  y: number;
}

/**
 * 緯度経度を局所平面(m)に射影する。
 * 数百m スケールの領土しか扱わないため、基準点まわりの等距円筒近似で十分な精度が出る。
 */
export function toPlanar(points: readonly TrackPoint[]): PlanarPoint[] {
  if (points.length === 0) return [];
  const originLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const originLng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  const mPerDegLat = (Math.PI / 180) * EARTH_RADIUS_M;
  const mPerDegLng = mPerDegLat * Math.cos(toRad(originLat));
  return points.map((p) => ({
    x: (p.lng - originLng) * mPerDegLng,
    y: (p.lat - originLat) * mPerDegLat,
  }));
}

/**
 * Shoelace(靴紐)公式でポリゴン面積(m²)を算出する。
 * 頂点の回転方向に依らないよう絶対値を取る。
 */
export function polygonAreaSquareMeters(points: readonly TrackPoint[]): number {
  if (points.length < 3) return 0;
  const planar = toPlanar(points);
  let sum = 0;
  for (let i = 0; i < planar.length; i++) {
    const a = planar[i];
    const b = planar[(i + 1) % planar.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

/** ポリゴン周長(m)。終点→始点の閉じる辺を含む。 */
export function polygonPerimeterMeters(points: readonly TrackPoint[]): number {
  if (points.length < 2) return 0;
  let total = pathLengthMeters(points);
  total += haversineMeters(points[points.length - 1], points[0]);
  return total;
}
