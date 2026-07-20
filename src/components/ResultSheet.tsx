import type { Achievement, ExplorationResult } from '../core/types';
import { formatArea, formatDistance, formatDuration, formatPoints } from '../ui/format';

interface Props {
  result: ExplorationResult;
  unlocked: Achievement[];
  onClose: () => void;
}

export function ResultSheet({ result, unlocked, onClose }: Props) {
  const { points } = result;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <div className="sheet">
        <h2 id="result-title">{result.loopClosed ? '領土を獲得しました' : '探索を記録しました'}</h2>

        <div className="result-points">
          <span className="result-points-value">+{formatPoints(points.total)}</span>
          <span className="result-points-unit">pt</span>
        </div>

        {!result.loopClosed && (
          <p className="note">
            始点と終点が離れているためループは成立しませんでした。歩いた距離に応じた救済ポイントを付与しています。
          </p>
        )}

        <dl className="stat-grid">
          <div>
            <dt>歩行距離</dt>
            <dd>{formatDistance(result.distanceMeters)}</dd>
          </div>
          <div>
            <dt>所要時間</dt>
            <dd>{formatDuration(result.durationMs)}</dd>
          </div>
          <div>
            <dt>領土面積</dt>
            <dd>{result.loopClosed ? formatArea(result.areaSquareMeters) : '—'}</dd>
          </div>
          <div>
            <dt>新規エリア</dt>
            <dd>{result.newCells.length} / {result.coveredCells.length}</dd>
          </div>
        </dl>

        {result.loopClosed && (
          <div className="breakdown">
            <h3>ポイント内訳</h3>
            <div className="breakdown-row">
              <span>基本（新規エリア {formatArea(result.newAreaSquareMeters)}）</span>
              <span>{formatPoints(points.base)} pt</span>
            </div>
            <div className="breakdown-row">
              <span>面積ボーナス</span>
              <span>×{points.areaMultiplier}</span>
            </div>
            <div className="breakdown-row">
              <span>コンパクトさ（{result.compactness.toFixed(2)}）</span>
              <span>×{points.compactnessMultiplier}</span>
            </div>
            {result.newCells.length === 0 && (
              <p className="note">
                すべて取得済みエリアのため面積ポイントは加算されません。新しい道を歩いてみましょう。
              </p>
            )}
          </div>
        )}

        {result.rejectedSpans.length > 0 && (
          <p className="note warn">
            異常な移動速度を検知したため、{result.rejectedSpans.length} 区間を記録から除外しました。
          </p>
        )}

        {unlocked.length > 0 && (
          <div className="breakdown">
            <h3>実績を解除しました</h3>
            {unlocked.map((a) => (
              <div className="breakdown-row" key={a.id}>
                <span>{a.title}</span>
                <span className="muted">{a.description}</span>
              </div>
            ))}
          </div>
        )}

        <div className="sheet-actions">
          <button className="btn btn-primary" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
