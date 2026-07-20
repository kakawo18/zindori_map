/** 測位 1 点。 */
export interface TrackPoint {
  lat: number;
  lng: number;
  /** epoch ms */
  t: number;
  /** 測位精度(m)。不明な場合は undefined。 */
  accuracy?: number;
}

/**
 * 記録一時停止で分断された連続区間。
 * GPS が途切れた場合に直線補間しないため、軌跡は区間の配列として保持する。
 */
export type TrackSegment = TrackPoint[];

/** 不正対策で除外された区間の情報。 */
export interface RejectedSpan {
  reason: 'speed';
  fromIndex: number;
  toIndex: number;
  speedKmh: number;
}

/** ループ確定処理の結果。 */
export interface ExplorationResult {
  id: string;
  /** epoch ms */
  finishedAt: number;
  /** ループが成立したか。false の場合は救済ポイントのみ。 */
  loopClosed: boolean;
  /** 歩行総距離(m)。 */
  distanceMeters: number;
  /** 経過時間(ms)。 */
  durationMs: number;
  /** ポリゴン面積(m²)。ループ未成立なら 0。 */
  areaSquareMeters: number;
  /** ポリゴン周長(m)。 */
  perimeterMeters: number;
  /** Polsby-Popper スコア(0..1)。ループ未成立なら 0。 */
  compactness: number;
  /** 簡略化後のポリゴン頂点（ループ成立時のみ）。 */
  polygon: TrackPoint[];
  /** ポリゴンが覆った H3 セル全体。 */
  coveredCells: string[];
  /** そのうち今回はじめて取得したセル。 */
  newCells: string[];
  /** 新規セル分の面積(m²)。ポイント計算の基礎値。 */
  newAreaSquareMeters: number;
  /** 不正判定で除外された区間。 */
  rejectedSpans: RejectedSpan[];
  points: PointBreakdown;
}

/** ポイントの内訳。UI でそのまま明細表示できる形にしておく。 */
export interface PointBreakdown {
  /** 新規セル面積に基づく基本ポイント。 */
  base: number;
  /** 面積ボーナス倍率(段階式)。 */
  areaMultiplier: number;
  /** コンパクトさボーナス倍率。 */
  compactnessMultiplier: number;
  /** ループ未成立時の救済ポイント。 */
  rescue: number;
  /** 最終獲得ポイント(整数)。 */
  total: number;
}

/** 実績定義とその進捗。 */
export interface Achievement {
  id: string;
  title: string;
  description: string;
  /** 達成に必要な値。 */
  goal: number;
  /** 現在値。 */
  progress: number;
  /** 達成した epoch ms。未達成なら null。 */
  unlockedAt: number | null;
}

/** 1 日 1 つ提示される簡易ミッション。 */
export interface Mission {
  id: string;
  /** YYYY-MM-DD (ローカル日付) */
  date: string;
  title: string;
  description: string;
  goal: number;
  progress: number;
  completedAt: number | null;
}

/** プレイヤーの累積状態。 */
export interface PlayerStats {
  lifetimePoints: number;
  totalDistanceMeters: number;
  totalCells: number;
  totalLoops: number;
  /** 連続プレイ日数。 */
  streakDays: number;
  /** 最後にプレイした日 YYYY-MM-DD。 */
  lastPlayedDate: string | null;
}

/** デイリーランキングの 1 行。 */
export interface RankingEntry {
  rank: number;
  name: string;
  points: number;
  isSelf: boolean;
}
