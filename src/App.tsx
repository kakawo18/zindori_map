import { useMemo, useState } from 'react';
import { AchievementsPanel } from './components/AchievementsPanel';
import { InfoPanel } from './components/InfoPanel';
import { MapView } from './components/MapView';
import { RankingPanel } from './components/RankingPanel';
import { ResultSheet } from './components/ResultSheet';
import { SafetyDialog } from './components/SafetyDialog';
import { pathLengthMeters } from './core/geo';
import type { Achievement, ExplorationResult } from './core/types';
import { STORES, idb } from './data/idb';
import { useGame } from './hooks/useGame';
import { useTracker } from './hooks/useTracker';
import { formatDistance, formatPoints } from './ui/format';

type Tab = 'explore' | 'ranking' | 'achievements' | 'info';

const TABS: { id: Tab; label: string }[] = [
  { id: 'explore', label: '探索' },
  { id: 'ranking', label: 'ランキング' },
  { id: 'achievements', label: '実績' },
  { id: 'info', label: '情報' },
];

export default function App() {
  const game = useGame();
  const tracker = useTracker();

  const [tab, setTab] = useState<Tab>('explore');
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [finished, setFinished] = useState<{ result: ExplorationResult; unlocked: Achievement[] } | null>(null);
  const [finishing, setFinishing] = useState(false);

  const ownedCells = useMemo(() => [...game.ownedCells], [game.ownedCells]);
  const liveDistance = useMemo(
    () => tracker.segments.reduce((sum, s) => sum + pathLengthMeters(s), 0),
    [tracker.segments],
  );

  const handleStart = () => {
    tracker.start();
    setSafetyOpen(false);
  };

  const handleStop = async () => {
    const segments = tracker.stop();
    setFinishing(true);
    try {
      setFinished(await game.finishExploration(segments));
    } finally {
      setFinishing(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('端末内の軌跡・領土・実績をすべて削除します。よろしいですか？')) return;
    await Promise.all(Object.values(STORES).map((store) => idb.clear(store)));
    window.location.reload();
  };

  if (!game.ready) {
    return <div className="loading">読み込み中…</div>;
  }

  return (
    <div className="app">
      <header className="header">
        <h1>ジンドリマップ</h1>
        <div className="header-points">
          <span>{formatPoints(game.todayPoints)}</span>
          <small>pt / 本日</small>
        </div>
      </header>

      <main className="main">
        {tab === 'explore' && (
          <div className="explore">
            <MapView
              ownedCells={ownedCells}
              segments={tracker.segments}
              current={tracker.current}
              followCurrent={tracker.status === 'tracking'}
            />

            {game.mission && (
              <div className="mission-card">
                <div className="mission-head">
                  <span className="badge">今日のミッション</span>
                  {game.mission.completedAt !== null && <span className="badge done">達成</span>}
                </div>
                <strong>{game.mission.title}</strong>
                <div className="progress">
                  <div
                    className="progress-bar"
                    style={{ width: `${Math.min(1, game.mission.progress / game.mission.goal) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="controls">
              {tracker.error && <p className="note warn">{tracker.error}</p>}

              {tracker.status === 'tracking' ? (
                <>
                  <div className="live-stats">
                    <div>
                      <span className="summary-label">歩行距離</span>
                      <span className="summary-value">{formatDistance(liveDistance)}</span>
                    </div>
                    <div>
                      <span className="summary-label">状態</span>
                      <span className="summary-value">
                        {tracker.paused ? '記録一時停止（GPS 待ち）' : '記録中'}
                      </span>
                    </div>
                  </div>
                  <button className="btn btn-danger btn-large" onClick={handleStop} disabled={finishing}>
                    {finishing ? '確定処理中…' : '探索を終了して確定する'}
                  </button>
                </>
              ) : (
                <button className="btn btn-primary btn-large" onClick={() => setSafetyOpen(true)}>
                  探索を開始する
                </button>
              )}
            </div>
          </div>
        )}

        {tab === 'ranking' && (
          <RankingPanel todayPoints={game.todayPoints} lifetimePoints={game.stats.lifetimePoints} />
        )}
        {tab === 'achievements' && (
          <AchievementsPanel achievements={game.achievements} stats={game.stats} />
        )}
        {tab === 'info' && (
          <InfoPanel pendingSyncCount={game.pendingSyncCount} onResetLocalData={handleReset} />
        )}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'tab active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {safetyOpen && <SafetyDialog onAgree={handleStart} onCancel={() => setSafetyOpen(false)} />}
      {finished && (
        <ResultSheet
          result={finished.result}
          unlocked={finished.unlocked}
          onClose={() => setFinished(null)}
        />
      )}
    </div>
  );
}
