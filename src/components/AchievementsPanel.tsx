import type { Achievement, PlayerStats } from '../core/types';
import { formatDistance, formatPoints } from '../ui/format';

interface Props {
  achievements: Achievement[];
  stats: PlayerStats;
}

export function AchievementsPanel({ achievements, stats }: Props) {
  const unlockedCount = achievements.filter((a) => a.unlockedAt !== null).length;

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>実績</h2>
        <span className="muted">
          {unlockedCount} / {achievements.length} 解除
        </span>
      </div>

      <div className="summary-row">
        <div>
          <span className="summary-label">取得エリア</span>
          <span className="summary-value">{formatPoints(stats.totalCells)}</span>
        </div>
        <div>
          <span className="summary-label">通算距離</span>
          <span className="summary-value">{formatDistance(stats.totalDistanceMeters)}</span>
        </div>
        <div>
          <span className="summary-label">連続プレイ</span>
          <span className="summary-value">{stats.streakDays} 日</span>
        </div>
      </div>

      <ul className="achievement-list">
        {achievements.map((a) => {
          const ratio = Math.min(1, a.progress / a.goal);
          const unlocked = a.unlockedAt !== null;
          return (
            <li key={a.id} className={unlocked ? 'achievement unlocked' : 'achievement'}>
              <div className="achievement-head">
                <span className="achievement-title">{a.title}</span>
                <span className="muted">
                  {Math.min(a.progress, a.goal).toLocaleString('ja-JP')} / {a.goal.toLocaleString('ja-JP')}
                </span>
              </div>
              <p className="achievement-desc">{a.description}</p>
              <div className="progress">
                <div className="progress-bar" style={{ width: `${ratio * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
