import type { Achievement, ExplorationResult, Mission, PlayerStats } from '../core/types';

export interface OwnedCell {
  cell: string;
  acquiredAt: number;
  /** 取得のきっかけとなった探索 ID。 */
  explorationId: string;
}

/** 未送信の探索結果（オフライン時に溜まる）。 */
export interface OutboxItem {
  seq?: number;
  exploration: ExplorationResult;
  queuedAt: number;
}

/**
 * 永続化層の抽象。
 * MVP はブラウザ内(IndexedDB)実装だが、同じインターフェースを
 * Supabase(PostGIS) 実装に差し替えられるようにしておく。
 */
export interface GameRepository {
  getOwnedCells(): Promise<Set<string>>;
  addOwnedCells(cells: readonly string[], explorationId: string, at: number): Promise<void>;

  getExplorations(): Promise<ExplorationResult[]>;
  saveExploration(result: ExplorationResult): Promise<void>;

  getStats(): Promise<PlayerStats>;
  saveStats(stats: PlayerStats): Promise<void>;

  getAchievements(): Promise<Achievement[]>;
  saveAchievements(achievements: readonly Achievement[]): Promise<void>;

  getMission(date: string): Promise<Mission | undefined>;
  saveMission(mission: Mission): Promise<void>;

  /** オフライン時の送信キュー。接続復帰時にまとめて送る。 */
  enqueue(item: OutboxItem): Promise<void>;
  listOutbox(): Promise<OutboxItem[]>;
  dequeue(seq: number): Promise<void>;
}

export const INITIAL_STATS: PlayerStats = {
  lifetimePoints: 0,
  totalDistanceMeters: 0,
  totalCells: 0,
  totalLoops: 0,
  streakDays: 0,
  lastPlayedDate: null,
};
