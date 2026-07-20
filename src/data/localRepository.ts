import type { Achievement, ExplorationResult, Mission, PlayerStats } from '../core/types';
import { idb, STORES } from './idb';
import { INITIAL_STATS, type GameRepository, type OutboxItem, type OwnedCell } from './repository';

const STATS_KEY = 'stats';

/**
 * IndexedDB による永続化実装。
 * 軌跡はまず端末ローカルに保存し、確定時にまとめて送信する方針に対応するため、
 * 送信キュー(outbox)もここで保持する。
 */
export const localRepository: GameRepository = {
  async getOwnedCells() {
    const rows = await idb.getAll<OwnedCell>(STORES.cells);
    return new Set(rows.map((r) => r.cell));
  },

  async addOwnedCells(cells, explorationId, at) {
    const rows: OwnedCell[] = cells.map((cell) => ({ cell, acquiredAt: at, explorationId }));
    await idb.putMany(STORES.cells, rows);
  },

  async getExplorations() {
    const rows = await idb.getAll<ExplorationResult>(STORES.explorations);
    return rows.sort((a, b) => b.finishedAt - a.finishedAt);
  },

  async saveExploration(result) {
    await idb.put(STORES.explorations, result);
  },

  async getStats() {
    const stats = await idb.get<PlayerStats>(STORES.meta, STATS_KEY);
    return stats ?? { ...INITIAL_STATS };
  },

  async saveStats(stats) {
    await idb.put(STORES.meta, stats, STATS_KEY);
  },

  async getAchievements() {
    return idb.getAll<Achievement>(STORES.achievements);
  },

  async saveAchievements(achievements) {
    await idb.putMany(STORES.achievements, achievements);
  },

  async getMission(date) {
    return idb.get<Mission>(STORES.missions, date);
  },

  async saveMission(mission) {
    await idb.put(STORES.missions, mission);
  },

  async enqueue(item) {
    await idb.put(STORES.outbox, item);
  },

  async listOutbox() {
    const rows = await idb.getAll<OutboxItem>(STORES.outbox);
    return rows.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  },

  async dequeue(seq) {
    await idb.delete(STORES.outbox, seq);
  },
};
