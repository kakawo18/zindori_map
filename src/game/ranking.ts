import type { RankingEntry } from '../core/types';

/**
 * デイリーランキング（毎日リセット、全体順位が見える）。
 *
 * MVP はローカル完結のため、比較対象となる他プレイヤーは
 * 日付シードから決定論的に生成したダミーデータ。
 * Supabase 接続時はこのモジュールをサーバー集計の取得に差し替える。
 */

const RIVAL_NAMES = [
  'あるきすと', 'ぽけっとさん', 'まちあるき部', 'ゆるトレッカー', 'コンパス',
  '早朝ランナー', 'さんぽ好き', 'ひなたぼっこ', 'かえるくん', 'ねこ歩き',
  'グリッド職人', 'テリトリアル', '徒歩勢', 'まっぷる', 'たんけんたい',
  'あおぞら', 'こみち', 'すたすた', 'ひとまわり', 'ぐるぐる',
];

/** xorshift ベースの決定論的乱数。 */
function makeRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xffffffff;
  };
}

function seedFromDate(date: string): number {
  let hash = 2166136261;
  for (let i = 0; i < date.length; i++) {
    hash ^= date.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * 自分の当日ポイントを与えると、ダミーライバルを混ぜた全体順位表を返す。
 * 自分の行は isSelf = true。
 */
export function buildDailyRanking(date: string, selfPoints: number, selfName = 'あなた'): RankingEntry[] {
  const random = makeRandom(seedFromDate(date));

  const rivals = RIVAL_NAMES.map((name) => {
    // 低ポイント帯に厚みが出るよう指数分布ぎみに散らす。
    const points = Math.round(50 + Math.pow(random(), 2.2) * 2400);
    return { name, points, isSelf: false };
  });

  const rows = [...rivals, { name: selfName, points: selfPoints, isSelf: true }];
  rows.sort((a, b) => b.points - a.points || Number(a.isSelf) - Number(b.isSelf));

  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}
