import { CONFIG } from '../config';
import { filterAbnormalSpeed } from './antiCheat';
import { pathLengthMeters } from './geo';
import { cellsAreaSquareMeters, polygonToCellIds } from './h3cells';
import { evaluateLoop } from './loop';
import { calculatePoints } from './scoring';
import { simplifyTrack } from './simplify';
import type { ExplorationResult, RejectedSpan, TrackSegment } from './types';

/**
 * 「終了ボタン」押下時の確定処理。
 *
 *  1. 異常速度区間を除外（不正対策）
 *  2. Douglas-Peucker で軌跡を簡略化（GPSノイズ除去）
 *  3. 始点・終点が一定距離以内ならループ成立
 *  4. Shoelace 公式で面積を算出
 *  5. H3 セルに変換し、既取得セルを差し引いて新規分を求める
 *  6. ポイント算出（未成立なら距離ベースの救済ポイント）
 *
 * `ownedCells` には確定前時点で既に取得済みのセル ID を渡す。
 */
export function finalizeExploration(
  segments: readonly TrackSegment[],
  ownedCells: ReadonlySet<string>,
  now: number = Date.now(),
): ExplorationResult {
  const rejectedSpans: RejectedSpan[] = [];
  const cleanSegments: TrackSegment[] = [];

  for (const segment of segments) {
    const { points, rejected } = filterAbnormalSpeed(segment);
    rejectedSpans.push(...rejected);
    if (points.length > 0) cleanSegments.push(points);
  }

  // 距離は区間ごとに算出して合算する。区間の切れ目は直線補間しない。
  const distanceMeters = cleanSegments.reduce((sum, s) => sum + pathLengthMeters(s), 0);

  const allPoints = cleanSegments.flat();
  const durationMs =
    allPoints.length >= 2 ? allPoints[allPoints.length - 1].t - allPoints[0].t : 0;

  // ループ判定は最長区間に対して行う。分断された軌跡をまたいで閉じたことにはしない。
  const mainSegment = cleanSegments.reduce<TrackSegment>(
    (longest, s) => (s.length > longest.length ? s : longest),
    [],
  );
  const simplified = simplifyTrack(mainSegment, CONFIG.loop.simplifyToleranceMeters);
  const loop = evaluateLoop(simplified);

  const coveredCells = loop.closed ? polygonToCellIds(simplified) : [];
  const newCells = coveredCells.filter((cell) => !ownedCells.has(cell));
  const newAreaSquareMeters = cellsAreaSquareMeters(newCells);

  const points = calculatePoints({
    loopClosed: loop.closed,
    newAreaSquareMeters,
    areaSquareMeters: loop.areaSquareMeters,
    compactness: loop.compactness,
    distanceMeters,
  });

  return {
    id: `exp_${now}_${Math.random().toString(36).slice(2, 8)}`,
    finishedAt: now,
    loopClosed: loop.closed,
    distanceMeters,
    durationMs,
    areaSquareMeters: loop.areaSquareMeters,
    perimeterMeters: loop.perimeterMeters,
    compactness: loop.compactness,
    polygon: loop.closed ? simplified : [],
    coveredCells,
    newCells,
    newAreaSquareMeters,
    rejectedSpans,
    points,
  };
}
