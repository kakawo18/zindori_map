import type { ExplorationResult, Mission } from '../core/types';

/**
 * 運営が手動配信する運用型ミッションではなく、
 * あらかじめ用意した固定条件からシステムが 1 日 1 つ自動提示する簡易ミッション。
 */
interface MissionDef {
  id: string;
  title: string;
  description: string;
  goal: number;
  /** 1 回の探索結果からミッションの加算値を取り出す。 */
  contributionOf: (result: ExplorationResult) => number;
}

const DEFS: MissionDef[] = [
  {
    id: 'take_1_cell',
    title: '今日中に1エリア取得',
    description: '新しいエリアを1つ取得しよう',
    goal: 1,
    contributionOf: (r) => r.newCells.length,
  },
  {
    id: 'take_3_cells',
    title: '今日中に3エリア取得',
    description: '新しいエリアを3つ取得しよう',
    goal: 3,
    contributionOf: (r) => r.newCells.length,
  },
  {
    id: 'area_500',
    title: '500㎡以上のエリアを1つ取得',
    description: '500㎡以上のループを1回成立させよう',
    goal: 1,
    contributionOf: (r) => (r.loopClosed && r.areaSquareMeters >= 500 ? 1 : 0),
  },
  {
    id: 'walk_2km',
    title: '2km 歩く',
    description: '今日の合計歩行距離2kmを目指そう',
    goal: 2000,
    contributionOf: (r) => Math.round(r.distanceMeters),
  },
  {
    id: 'compact_loop',
    title: '整った形のループを作る',
    description: 'コンパクトさスコア0.5以上のループを1回成立させよう',
    goal: 1,
    contributionOf: (r) => (r.loopClosed && r.compactness >= 0.5 ? 1 : 0),
  },
];

/** ローカル日付 YYYY-MM-DD。ランキングの日次リセット境界にも使う。 */
export function localDateKey(at: number = Date.now()): string {
  const d = new Date(at);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** 日付文字列から決定論的にシード値を作る（同じ日は必ず同じミッション）。 */
function seedFromDate(date: string): number {
  let hash = 0;
  for (let i = 0; i < date.length; i++) hash = (hash * 31 + date.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

/** その日のミッションを生成する。1日1つ、日付が変われば自動で切り替わる。 */
export function missionForDate(date: string): Mission {
  const def = DEFS[seedFromDate(date) % DEFS.length];
  return {
    id: def.id,
    date,
    title: def.title,
    description: def.description,
    goal: def.goal,
    progress: 0,
    completedAt: null,
  };
}

/** 探索結果をミッション進捗に反映する。 */
export function applyToMission(
  mission: Mission,
  result: ExplorationResult,
  now: number,
): Mission {
  const def = DEFS.find((d) => d.id === mission.id);
  if (!def || mission.completedAt !== null) return mission;

  const progress = Math.min(mission.goal, mission.progress + def.contributionOf(result));
  return {
    ...mission,
    progress,
    completedAt: progress >= mission.goal ? now : null,
  };
}
