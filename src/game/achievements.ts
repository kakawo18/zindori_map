import type { Achievement, PlayerStats } from '../core/types';

/**
 * 実績定義。
 * シンプルなカウント・フラグ管理で完結するものだけを対象とする。
 * 「都道府県◯%制覇」のような行政境界データとの交差計算が必要な実績は MVP 対象外。
 */
interface AchievementDef {
  id: string;
  title: string;
  description: string;
  goal: number;
  /** 累積状態から現在値を取り出す。 */
  progressOf: (stats: PlayerStats) => number;
}

const DEFS: AchievementDef[] = [
  { id: 'first_cell', title: 'はじめの一歩', description: 'エリアを1つ取得する', goal: 1, progressOf: (s) => s.totalCells },
  { id: 'cells_10', title: '町内会デビュー', description: 'エリアを10取得する', goal: 10, progressOf: (s) => s.totalCells },
  { id: 'cells_50', title: '常連', description: 'エリアを50取得する', goal: 50, progressOf: (s) => s.totalCells },
  { id: 'cells_200', title: '大領主', description: 'エリアを200取得する', goal: 200, progressOf: (s) => s.totalCells },
  { id: 'loops_5', title: '周回者', description: 'ループを5回成立させる', goal: 5, progressOf: (s) => s.totalLoops },
  { id: 'distance_5k', title: '5km ウォーカー', description: '通算5km歩く', goal: 5000, progressOf: (s) => s.totalDistanceMeters },
  { id: 'distance_42k', title: 'フルマラソン', description: '通算42.195km歩く', goal: 42195, progressOf: (s) => s.totalDistanceMeters },
  { id: 'streak_3', title: '三日坊主 返上', description: '3日連続でプレイする', goal: 3, progressOf: (s) => s.streakDays },
  { id: 'streak_7', title: '週間皆勤', description: '7日連続でプレイする', goal: 7, progressOf: (s) => s.streakDays },
];

/** 未保存の実績を初期状態で埋めつつ、現在の累積状態から進捗を再計算する。 */
export function recalcAchievements(
  saved: readonly Achievement[],
  stats: PlayerStats,
  now: number,
): Achievement[] {
  const savedById = new Map(saved.map((a) => [a.id, a]));

  return DEFS.map((def) => {
    const previous = savedById.get(def.id);
    const progress = def.progressOf(stats);
    const alreadyUnlocked = previous?.unlockedAt ?? null;

    return {
      id: def.id,
      title: def.title,
      description: def.description,
      goal: def.goal,
      progress,
      unlockedAt: alreadyUnlocked ?? (progress >= def.goal ? now : null),
    };
  });
}

/** 再計算の前後で新たに解除された実績を返す（通知表示用）。 */
export function newlyUnlocked(
  before: readonly Achievement[],
  after: readonly Achievement[],
): Achievement[] {
  const unlockedBefore = new Set(before.filter((a) => a.unlockedAt !== null).map((a) => a.id));
  return after.filter((a) => a.unlockedAt !== null && !unlockedBefore.has(a.id));
}
