interface Props {
  onAgree: () => void;
  onCancel: () => void;
}

/**
 * 探索開始時の安全警告。
 * MVP ではこのダイアログ表示のみを行い、速度検知による記録停止や
 * 音声/バイブ通知は対象外とする。
 */
export function SafetyDialog({ onAgree, onCancel }: Props) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="safety-title">
      <div className="sheet">
        <h2 id="safety-title">歩きスマホは危険です</h2>
        <ul className="safety-list">
          <li>画面を見ながらの歩行はやめましょう。立ち止まって操作してください。</li>
          <li>車道・踏切・駅のホーム・階段など、危険な場所では操作しないでください。</li>
          <li>私有地や立入禁止区域には入らないでください。</li>
          <li>周囲の状況と交通ルールを最優先してください。</li>
        </ul>
        <div className="sheet-actions">
          <button className="btn btn-ghost" onClick={onCancel}>
            やめる
          </button>
          <button className="btn btn-primary" onClick={onAgree}>
            理解して開始する
          </button>
        </div>
      </div>
    </div>
  );
}
