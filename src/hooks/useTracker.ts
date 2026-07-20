import { useCallback, useEffect, useRef, useState } from 'react';
import { CONFIG } from '../config';
import { haversineMeters } from '../core/geo';
import type { TrackPoint, TrackSegment } from '../core/types';

export type TrackerStatus = 'idle' | 'tracking';

export interface TrackerState {
  status: TrackerStatus;
  /** 記録一時停止で分断された区間の配列。 */
  segments: TrackSegment[];
  /** 直近の測位点（地図の現在地表示用）。 */
  current: TrackPoint | null;
  /** GPS が途切れて一時停止扱いになっているか。 */
  paused: boolean;
  error: string | null;
}

function describeError(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return '位置情報の利用が許可されていません。ブラウザの設定から許可してください。';
    case error.POSITION_UNAVAILABLE:
      return '現在地を取得できませんでした。屋外で再度お試しください。';
    case error.TIMEOUT:
      return '測位がタイムアウトしました。';
    default:
      return '位置情報の取得中にエラーが発生しました。';
  }
}

/**
 * フォアグラウンド限定の軌跡記録。
 * バックグラウンド常時トラッキングは MVP 対象外のため、
 * タブが非表示になっている間の測位は行わない。
 */
export function useTracker() {
  const [state, setState] = useState<TrackerState>({
    status: 'idle',
    segments: [],
    current: null,
    paused: false,
    error: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const pauseTimerRef = useRef<number | null>(null);

  const clearPauseTimer = () => {
    if (pauseTimerRef.current !== null) {
      window.clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
  };

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    clearPauseTimer();
  }, []);

  const handlePosition = useCallback((position: GeolocationPosition) => {
    const point: TrackPoint = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      t: position.timestamp,
      accuracy: position.coords.accuracy,
    };

    // 一定時間 測位が来なければ「記録一時停止」に落とす。
    // 復帰時は直線補間せず新しい区間として記録を再開する。
    clearPauseTimer();
    pauseTimerRef.current = window.setTimeout(() => {
      setState((prev) => (prev.status === 'tracking' ? { ...prev, paused: true } : prev));
    }, CONFIG.tracking.signalLossSeconds * 1000);

    setState((prev) => {
      if (prev.status !== 'tracking') return { ...prev, current: point };

      // 精度が悪すぎる測位は軌跡に採用しない（現在地表示にも使わない）。
      if (point.accuracy !== undefined && point.accuracy > CONFIG.tracking.maxAccuracyMeters) {
        return { ...prev, error: null };
      }

      const segments = prev.segments.map((s) => [...s]);
      const lastSegment = segments[segments.length - 1];
      const lastPoint = lastSegment?.[lastSegment.length - 1];

      const gapSeconds = lastPoint ? (point.t - lastPoint.t) / 1000 : 0;
      const signalLost = gapSeconds > CONFIG.tracking.signalLossSeconds;

      if (!lastSegment || signalLost) {
        segments.push([point]);
      } else if (
        !lastPoint ||
        haversineMeters(lastPoint, point) >= CONFIG.tracking.minMoveMeters
      ) {
        lastSegment.push(point);
      } else {
        // 移動量が小さい場合は軌跡に追加せず、現在地だけ更新する。
        return { ...prev, current: point, paused: false, error: null };
      }

      return { ...prev, segments, current: point, paused: false, error: null };
    });
  }, []);

  const handleError = useCallback((error: GeolocationPositionError) => {
    setState((prev) => ({ ...prev, error: describeError(error) }));
  }, []);

  const startWatch = useCallback(() => {
    if (watchIdRef.current !== null) return;
    watchIdRef.current = navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000,
    });
  }, [handleError, handlePosition]);

  /** 探索を開始する。安全警告への同意後に呼ばれる想定。 */
  const start = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState((prev) => ({ ...prev, error: 'この端末では位置情報を利用できません。' }));
      return;
    }
    setState({ status: 'tracking', segments: [], current: null, paused: false, error: null });
    stopWatch();
    startWatch();
  }, [startWatch, stopWatch]);

  /** 探索を終了し、記録した区間を返す。確定処理は呼び出し側で行う。 */
  const stop = useCallback((): TrackSegment[] => {
    stopWatch();
    let captured: TrackSegment[] = [];
    setState((prev) => {
      captured = prev.segments;
      return { ...prev, status: 'idle', paused: false };
    });
    return captured;
  }, [stopWatch]);

  /** 現在地だけを一度取得する（記録開始前の地図初期表示用）。 */
  const locateOnce = useCallback(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setState((prev) => ({
          ...prev,
          current: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            t: position.timestamp,
            accuracy: position.coords.accuracy,
          },
        })),
      handleError,
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, [handleError]);

  // フォアグラウンド限定。タブが隠れたら watch を止め、戻ったら再開する。
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        stopWatch();
      } else if (state.status === 'tracking') {
        startWatch();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [startWatch, state.status, stopWatch]);

  useEffect(() => stopWatch, [stopWatch]);

  return { ...state, start, stop, locateOnce };
}
