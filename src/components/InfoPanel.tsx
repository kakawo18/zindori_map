import { CONFIG } from '../config';

interface Props {
  pendingSyncCount: number;
  onResetLocalData: () => void;
}

export function InfoPanel({ pendingSyncCount, onResetLocalData }: Props) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>情報</h2>
      </div>

      <section className="info-section">
        <h3>位置情報の取り扱い（草案）</h3>
        <p>
          本アプリは、歩行軌跡から領土を生成するために位置情報を取得します。
          取得した軌跡・領土ポリゴンは<strong>端末内にのみ保存</strong>され、地図上で他ユーザーに公開されることはありません。
          他ユーザーに公開されるのはポイントと実績のみです。
        </p>
        <p className="note warn">
          この文面は実装確認用の草案です。リリース前に、利用目的・保存期間・第三者提供の有無を明記した
          正式なプライバシーポリシーへの差し替えが必要です。
        </p>
      </section>

      <section className="info-section">
        <h3>記録方式</h3>
        <ul className="info-list">
          <li>記録はフォアグラウンド限定です。画面を閉じている間は記録されません。</li>
          <li>GPS が {CONFIG.tracking.signalLossSeconds} 秒以上途切れた場合は直線補間せず、記録一時停止として区間を分割します。</li>
          <li>始点と終点が {CONFIG.loop.closeDistanceMeters}m 以内でループ成立と判定します。</li>
          <li>時速 {CONFIG.antiCheat.maxSpeedKmh}km を超える区間は記録から除外します。</li>
          <li>同じエリア（H3 セル）を再度歩いても面積ポイントは加算されません。</li>
        </ul>
      </section>

      <section className="info-section">
        <h3>同期</h3>
        <p>
          未送信の探索: <strong>{pendingSyncCount} 件</strong>
        </p>
        <p className="note">
          MVP はローカル完結のため、送信キューに積まれたまま保持されます。
          Supabase 接続時に、接続復帰を検知してまとめて送信する処理を差し込みます。
        </p>
      </section>

      <section className="info-section">
        <h3>デバッグ</h3>
        <button className="btn btn-danger" onClick={onResetLocalData}>
          ローカルデータを全消去
        </button>
      </section>
    </div>
  );
}
