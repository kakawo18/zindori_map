import { CONFIG } from '../config';
import { haversineMeters, polygonAreaSquareMeters, polygonPerimeterMeters } from './geo';
import type { TrackPoint } from './types';

export interface LoopEvaluation {
  closed: boolean;
  /** 始点-終点間の距離(m)。 */
  gapMeters: number;
  areaSquareMeters: number;
  perimeterMeters: number;
  /** Polsby-Popper スコア (0..1)。1 に近いほど円に近い＝整った形。 */
  compactness: number;
}

/**
 * コンパクトさの評価に Polsby-Popper スコア `4π×面積 ÷ 周長²` を用いる。
 * 厳密な正方形判定は GPS 軌跡と相性が悪いため、連続値で評価する。
 */
export function polsbyPopper(areaSquareMeters: number, perimeterMeters: number): number {
  if (perimeterMeters <= 0) return 0;
  const score = (4 * Math.PI * areaSquareMeters) / perimeterMeters ** 2;
  return Math.max(0, Math.min(1, score));
}

/**
 * 簡略化済みの点列がループとして成立するかを判定し、面積・形状指標を返す。
 * 始点と終点が closeDistanceMeters 以内であればループ成立とみなす。
 */
export function evaluateLoop(points: readonly TrackPoint[]): LoopEvaluation {
  const empty: LoopEvaluation = {
    closed: false,
    gapMeters: Infinity,
    areaSquareMeters: 0,
    perimeterMeters: 0,
    compactness: 0,
  };
  if (points.length < CONFIG.loop.minPoints) return empty;

  const gapMeters = haversineMeters(points[0], points[points.length - 1]);
  if (gapMeters > CONFIG.loop.closeDistanceMeters) return { ...empty, gapMeters };

  const areaSquareMeters = polygonAreaSquareMeters(points);
  const perimeterMeters = polygonPerimeterMeters(points);
  if (areaSquareMeters <= 0) return { ...empty, gapMeters };

  return {
    closed: true,
    gapMeters,
    areaSquareMeters,
    perimeterMeters,
    compactness: polsbyPopper(areaSquareMeters, perimeterMeters),
  };
}
