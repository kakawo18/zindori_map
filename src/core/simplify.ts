import { toPlanar, type PlanarPoint } from './geo';
import type { TrackPoint } from './types';

/** 点 p から線分 ab への垂線距離。 */
function perpendicularDistance(p: PlanarPoint, a: PlanarPoint, b: PlanarPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);

  // 線分上の最近傍点をパラメータ t で求め、[0,1] に丸める。
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function douglasPeuckerIndices(
  planar: PlanarPoint[],
  first: number,
  last: number,
  tolerance: number,
  keep: boolean[],
): void {
  if (last <= first + 1) return;

  let maxDistance = 0;
  let maxIndex = first;
  for (let i = first + 1; i < last; i++) {
    const d = perpendicularDistance(planar[i], planar[first], planar[last]);
    if (d > maxDistance) {
      maxDistance = d;
      maxIndex = i;
    }
  }

  if (maxDistance <= tolerance) return;

  keep[maxIndex] = true;
  douglasPeuckerIndices(planar, first, maxIndex, tolerance, keep);
  douglasPeuckerIndices(planar, maxIndex, last, tolerance, keep);
}

/**
 * Douglas-Peucker で軌跡を簡略化し GPS ノイズを除去する。
 * 許容誤差は m 単位で指定する。
 */
export function simplifyTrack(points: readonly TrackPoint[], toleranceMeters: number): TrackPoint[] {
  if (points.length <= 2) return [...points];

  const planar = toPlanar(points);
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  douglasPeuckerIndices(planar, 0, points.length - 1, toleranceMeters, keep);

  return points.filter((_, i) => keep[i]);
}
