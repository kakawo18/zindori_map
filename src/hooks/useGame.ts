import { useCallback, useEffect, useState } from 'react';
import type { Achievement, ExplorationResult, Mission, PlayerStats, TrackSegment } from '../core/types';
import { finalizeExploration } from '../core/finalize';
import { localRepository } from '../data/localRepository';
import { INITIAL_STATS } from '../data/repository';
import { newlyUnlocked, recalcAchievements } from '../game/achievements';
import { applyToMission, localDateKey, missionForDate } from '../game/missions';

const repository = localRepository;

export interface GameState {
  ready: boolean;
  ownedCells: Set<string>;
  explorations: ExplorationResult[];
  stats: PlayerStats;
  achievements: Achievement[];
  mission: Mission | null;
  /** 未送信のままローカルに溜まっている探索の件数。 */
  pendingSyncCount: number;
}

/** 前回プレイ日から連続プレイ日数を更新する。 */
function nextStreak(stats: PlayerStats, today: string): number {
  if (stats.lastPlayedDate === today) return stats.streakDays;

  const yesterday = localDateKey(new Date(`${today}T00:00:00`).getTime() - 86400000);
  return stats.lastPlayedDate === yesterday ? stats.streakDays + 1 : 1;
}

export function useGame() {
  const [state, setState] = useState<GameState>({
    ready: false,
    ownedCells: new Set(),
    explorations: [],
    stats: { ...INITIAL_STATS },
    achievements: [],
    mission: null,
    pendingSyncCount: 0,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const today = localDateKey();
      const [ownedCells, explorations, stats, savedAchievements, savedMission, outbox] =
        await Promise.all([
          repository.getOwnedCells(),
          repository.getExplorations(),
          repository.getStats(),
          repository.getAchievements(),
          repository.getMission(today),
          repository.listOutbox(),
        ]);

      // ミッションは日付が変わったら自動で切り替わる（1日1つ）。
      const mission = savedMission ?? missionForDate(today);
      if (!savedMission) await repository.saveMission(mission);

      const achievements = recalcAchievements(savedAchievements, stats, Date.now());

      if (cancelled) return;
      setState({
        ready: true,
        ownedCells,
        explorations,
        stats,
        achievements,
        mission,
        pendingSyncCount: outbox.length,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * 終了ボタン押下からの一連の確定処理。
   * 結果と、今回新たに解除された実績を返す。
   */
  const finishExploration = useCallback(
    async (segments: readonly TrackSegment[]) => {
      const now = Date.now();
      const today = localDateKey(now);

      const ownedCells = await repository.getOwnedCells();
      const result = finalizeExploration(segments, ownedCells, now);

      const previousStats = await repository.getStats();
      const stats: PlayerStats = {
        lifetimePoints: previousStats.lifetimePoints + result.points.total,
        totalDistanceMeters: previousStats.totalDistanceMeters + result.distanceMeters,
        totalCells: previousStats.totalCells + result.newCells.length,
        totalLoops: previousStats.totalLoops + (result.loopClosed ? 1 : 0),
        streakDays: nextStreak(previousStats, today),
        lastPlayedDate: today,
      };

      const previousAchievements = await repository.getAchievements();
      const achievements = recalcAchievements(previousAchievements, stats, now);
      const unlocked = newlyUnlocked(recalcAchievements(previousAchievements, previousStats, now), achievements);

      const currentMission = (await repository.getMission(today)) ?? missionForDate(today);
      const mission = applyToMission(currentMission, result, now);

      await Promise.all([
        repository.saveExploration(result),
        repository.addOwnedCells(result.newCells, result.id, now),
        repository.saveStats(stats),
        repository.saveAchievements(achievements),
        repository.saveMission(mission),
        // ネット接続がない状態で終了した場合に備え、送信キューにも積む。
        // 接続復帰時にまとめて送信する想定（Supabase 接続時に flush 実装を差し込む）。
        repository.enqueue({ exploration: result, queuedAt: now }),
      ]);

      const outbox = await repository.listOutbox();
      const nextOwned = new Set(ownedCells);
      for (const cell of result.newCells) nextOwned.add(cell);

      setState((prev) => ({
        ...prev,
        ownedCells: nextOwned,
        explorations: [result, ...prev.explorations],
        stats,
        achievements,
        mission,
        pendingSyncCount: outbox.length,
      }));

      return { result, unlocked };
    },
    [],
  );

  /** 当日の獲得ポイント合計（デイリーランキング用）。 */
  const todayPoints = state.explorations
    .filter((e) => localDateKey(e.finishedAt) === localDateKey())
    .reduce((sum, e) => sum + e.points.total, 0);

  return { ...state, todayPoints, finishExploration };
}
