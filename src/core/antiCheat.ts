import { CONFIG } from '../config';
import { haversineMeters } from './geo';
import type { RejectedSpan, TrackPoint } from './types';

export interface SpeedFilterResult {
  /** 異常速度区間を取り除いた点列。 */
  points: TrackPoint[];
  rejected: RejectedSpan[];
}

/**
 * 異常な移動速度（既定: 時速20km超）の区間を検出して除外する。
 * MVP 範囲の最低限の不正対策であり、デバイス認証やサーバー側リプレイ検証は対象外。
 */
export function filterAbnormalSpeed(
  points: readonly TrackPoint[],
  maxSpeedKmh: number = CONFIG.antiCheat.maxSpeedKmh,
): SpeedFilterResult {
  if (points.length < 2) return { points: [...points], rejected: [] };

  const maxSpeedMps = (maxSpeedKmh * 1000) / 3600;
  const kept: TrackPoint[] = [points[0]];
  const rejected: RejectedSpan[] = [];

  for (let i = 1; i < points.length; i++) {
    const prev = kept[kept.length - 1];
    const curr = points[i];
    const dtSeconds = (curr.t - prev.t) / 1000;

    // 同時刻・時刻逆転は速度を評価できないので通す（後段の簡略化で吸収される）。
    if (dtSeconds <= 0) {
      kept.push(curr);
      continue;
    }

    const speedMps = haversineMeters(prev, curr) / dtSeconds;
    if (speedMps > maxSpeedMps) {
      rejected.push({
        reason: 'speed',
        fromIndex: i - 1,
        toIndex: i,
        speedKmh: (speedMps * 3600) / 1000,
      });
      continue;
    }
    kept.push(curr);
  }

  return { points: kept, rejected };
}
