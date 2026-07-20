import { describe, expect, it } from 'vitest';
import { finalizeExploration } from './finalize';
import { polygonAreaSquareMeters } from './geo';
import { simplifyTrack } from './simplify';
import { polsbyPopper } from './loop';
import { areaBonusMultiplier } from './scoring';
import type { TrackPoint } from './types';

const ORIGIN = { lat: 35.681, lng: 139.767 };
const M_PER_DEG_LAT = 111320;
const M_PER_DEG_LNG = M_PER_DEG_LAT * Math.cos((ORIGIN.lat * Math.PI) / 180);

/** 原点からの m オフセットで点を作る。 */
function at(xMeters: number, yMeters: number, tSeconds: number): TrackPoint {
  return {
    lat: ORIGIN.lat + yMeters / M_PER_DEG_LAT,
    lng: ORIGIN.lng + xMeters / M_PER_DEG_LNG,
    t: 1_700_000_000_000 + tSeconds * 1000,
    accuracy: 5,
  };
}

/** 一辺 side(m) の正方形を、辺あたり steps 点で歩いた軌跡。 */
function squareWalk(side: number, steps = 5, startSecond = 0): TrackPoint[] {
  const corners: [number, number][] = [
    [0, 0],
    [side, 0],
    [side, side],
    [0, side],
    [0, 0],
  ];
  const points: TrackPoint[] = [];
  let t = startSecond;
  for (let c = 0; c < corners.length - 1; c++) {
    const [x0, y0] = corners[c];
    const [x1, y1] = corners[c + 1];
    for (let s = 0; s < steps; s++) {
      const ratio = s / steps;
      points.push(at(x0 + (x1 - x0) * ratio, y0 + (y1 - y0) * ratio, t));
      t += 4; // 1辺 steps 点、徒歩相当の速度
    }
  }
  points.push(at(0, 0, t));
  return points;
}

describe('geo', () => {
  it('Shoelace 公式が正方形の面積を近似できる', () => {
    const area = polygonAreaSquareMeters(squareWalk(40));
    expect(area).toBeGreaterThan(1560);
    expect(area).toBeLessThan(1640);
  });
});

describe('simplify', () => {
  it('直線上の中間点を Douglas-Peucker で除去する', () => {
    const line = [at(0, 0, 0), at(10, 0, 5), at(20, 0, 10), at(30, 0, 15)];
    expect(simplifyTrack(line, 5)).toHaveLength(2);
  });

  it('角は保持する', () => {
    const simplified = simplifyTrack(squareWalk(40), 5);
    expect(simplified.length).toBeGreaterThanOrEqual(4);
  });
});

describe('polsbyPopper', () => {
  it('円で 1 に近づき、細長い形では小さくなる', () => {
    const r = 30;
    expect(polsbyPopper(Math.PI * r * r, 2 * Math.PI * r)).toBeCloseTo(1, 5);
    // 100m x 2m の細長い矩形
    expect(polsbyPopper(200, 204 * 2)).toBeLessThan(0.02);
  });
});

describe('areaBonusMultiplier', () => {
  it('段階式の閾値で倍率が切り替わる', () => {
    expect(areaBonusMultiplier(99)).toBe(1);
    expect(areaBonusMultiplier(100)).toBe(1.5);
    expect(areaBonusMultiplier(500)).toBe(2);
    expect(areaBonusMultiplier(2000)).toBe(3);
  });
});

describe('finalizeExploration', () => {
  it('閉じた正方形でループが成立しポイントが入る', () => {
    const result = finalizeExploration([squareWalk(40)], new Set());

    expect(result.loopClosed).toBe(true);
    expect(result.areaSquareMeters).toBeGreaterThan(1500);
    expect(result.newCells.length).toBeGreaterThan(0);
    expect(result.points.total).toBeGreaterThan(0);
    expect(result.points.areaMultiplier).toBe(2); // 500〜2000㎡
  });

  it('既取得セルは面積ポイントに加算されない', () => {
    const first = finalizeExploration([squareWalk(40)], new Set());
    const owned = new Set(first.coveredCells);
    const second = finalizeExploration([squareWalk(40)], owned);

    expect(second.loopClosed).toBe(true);
    expect(second.newCells).toHaveLength(0);
    expect(second.points.total).toBe(0);
  });

  it('始点と終点が離れていればループ未成立で救済ポイントのみ', () => {
    const openWalk = [at(0, 0, 0), at(30, 0, 20), at(60, 0, 40), at(90, 0, 60)];
    const result = finalizeExploration([openWalk], new Set());

    expect(result.loopClosed).toBe(false);
    expect(result.areaSquareMeters).toBe(0);
    expect(result.points.base).toBe(0);
    expect(result.points.rescue).toBeGreaterThan(0);
    expect(result.points.total).toBe(result.points.rescue);
  });

  it('時速20km超の区間を除外する', () => {
    // 1 秒で 100m 移動 = 360km/h
    const walk = [at(0, 0, 0), at(10, 0, 10), at(1000, 0, 11), at(20, 0, 30)];
    const result = finalizeExploration([walk], new Set());

    expect(result.rejectedSpans).toHaveLength(1);
    expect(result.rejectedSpans[0].speedKmh).toBeGreaterThan(20);
  });

  it('分断された区間をまたいでループ成立とはみなさない', () => {
    // 正方形の 2 辺ずつを別区間に分ける（GPS 途切れ相当）
    const full = squareWalk(40);
    const half = Math.floor(full.length / 2);
    const result = finalizeExploration([full.slice(0, half), full.slice(half)], new Set());

    expect(result.loopClosed).toBe(false);
    // 距離は両区間の合計として残る
    expect(result.distanceMeters).toBeGreaterThan(100);
  });
});
