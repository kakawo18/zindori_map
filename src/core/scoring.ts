import { CONFIG } from '../config';
import type { PointBreakdown } from './types';

/**
 * 面積ボーナスは段階式（閾値方式）。
 * 線形にせず段階にすることで「次の段階まであと少し」という目標感を作る。
 */
export function areaBonusMultiplier(areaSquareMeters: number): number {
  const tier = CONFIG.scoring.areaBonusTiers.find((t) => areaSquareMeters >= t.minArea);
  return tier?.multiplier ?? 1;
}

/** Polsby-Popper スコア(0..1)を倍率レンジに線形写像する。 */
export function compactnessMultiplier(compactness: number): number {
  const { min, max } = CONFIG.scoring.compactness;
  const clamped = Math.max(0, Math.min(1, compactness));
  return min + (max - min) * clamped;
}

export interface ScoreInput {
  loopClosed: boolean;
  /** 新規取得セル分の面積(m²)。既取得セルは含めない。 */
  newAreaSquareMeters: number;
  /** ポリゴン全体の面積(m²)。面積ボーナスの段階判定に使う。 */
  areaSquareMeters: number;
  compactness: number;
  /** 歩行総距離(m)。救済ポイントの算定に使う。 */
  distanceMeters: number;
}

/**
 * ポイントを算出する。
 * ループ未成立でも歩行距離に応じた救済ポイントを付与し、
 * 「歩いたのに何も得られない」徒労感を防ぐ。
 */
export function calculatePoints(input: ScoreInput): PointBreakdown {
  const { pointsPerSquareMeter, rescuePointsPerMeter } = CONFIG.scoring;

  if (!input.loopClosed) {
    const rescue = Math.round(input.distanceMeters * rescuePointsPerMeter);
    return {
      base: 0,
      areaMultiplier: 1,
      compactnessMultiplier: 1,
      rescue,
      total: rescue,
    };
  }

  const base = input.newAreaSquareMeters * pointsPerSquareMeter;
  const areaMultiplier = areaBonusMultiplier(input.areaSquareMeters);
  const compactMultiplier = compactnessMultiplier(input.compactness);

  return {
    base: Math.round(base),
    areaMultiplier,
    compactnessMultiplier: Number(compactMultiplier.toFixed(2)),
    rescue: 0,
    total: Math.round(base * areaMultiplier * compactMultiplier),
  };
}
