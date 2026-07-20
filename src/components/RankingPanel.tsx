import { useMemo } from 'react';
import { buildDailyRanking } from '../game/ranking';
import { localDateKey } from '../game/missions';
import { formatPoints } from '../ui/format';

interface Props {
  todayPoints: number;
  lifetimePoints: number;
}

/** デイリーランキング（毎日リセット）。生涯ポイントは参考表示。 */
export function RankingPanel({ todayPoints, lifetimePoints }: Props) {
  const today = localDateKey();
  const rows = useMemo(() => buildDailyRanking(today, todayPoints), [today, todayPoints]);
  const self = rows.find((r) => r.isSelf);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>デイリーランキング</h2>
        <span className="muted">{today} / 毎日リセット</span>
      </div>

      <div className="summary-row">
        <div>
          <span className="summary-label">本日の順位</span>
          <span className="summary-value">{self ? `${self.rank}位` : '—'}</span>
        </div>
        <div>
          <span className="summary-label">本日のポイント</span>
          <span className="summary-value">{formatPoints(todayPoints)} pt</span>
        </div>
        <div>
          <span className="summary-label">生涯ポイント</span>
          <span className="summary-value">{formatPoints(lifetimePoints)} pt</span>
        </div>
      </div>

      <ol className="ranking-list">
        {rows.map((row) => (
          <li key={`${row.rank}-${row.name}`} className={row.isSelf ? 'ranking-row self' : 'ranking-row'}>
            <span className="ranking-rank">{row.rank}</span>
            <span className="ranking-name">{row.name}</span>
            <span className="ranking-points">{formatPoints(row.points)} pt</span>
          </li>
        ))}
      </ol>

      <p className="note">
        ローカル完結の MVP のため、自分以外の順位は日付シードから生成したダミーデータです。
        Supabase 接続時にサーバー集計へ差し替えます。
      </p>
    </div>
  );
}
