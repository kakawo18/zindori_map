/**
 * ゲームバランス・チューニング用の定数。
 * 仕様書上「要実測調整」とされている値はすべてここに集約する。
 */

export const CONFIG = {
  /** H3 解像度。res12 は 1 セルあたり平均 307m² 程度。 */
  h3Resolution: 12,

  tracking: {
    /** 記録点として採用する最小移動距離(m)。GPS の微振動を捨てる。 */
    minMoveMeters: 3,
    /** これを超える精度(m)の測位は破棄する。 */
    maxAccuracyMeters: 50,
    /** この秒数以上 測位が途切れたら「記録一時停止」として区間を分断する。 */
    signalLossSeconds: 30,
  },

  loop: {
    /** 始点と終点がこの距離(m)以内ならループ成立とみなす。 */
    closeDistanceMeters: 20,
    /** ループ判定に必要な最小点数。 */
    minPoints: 4,
    /** Douglas-Peucker の許容誤差(m)。 */
    simplifyToleranceMeters: 5,
  },

  antiCheat: {
    /** この速度(km/h)を超える区間は不正移動とみなす。 */
    maxSpeedKmh: 20,
  },

  scoring: {
    /** 新規セル面積 1m² あたりの基本ポイント。 */
    pointsPerSquareMeter: 0.1,
    /** 面積ボーナス（段階式）。閾値は「その面積以上」で適用。 */
    areaBonusTiers: [
      { minArea: 2000, multiplier: 3 },
      { minArea: 500, multiplier: 2 },
      { minArea: 100, multiplier: 1.5},
      { minArea: 0, multiplier: 1 },
    ],
    /** コンパクトさ(Polsby-Popper)ボーナスの倍率レンジ。score 0→min, 1→max。 */
    compactness: { min: 1.0, max: 1.5 },
    /** 救済ポイント: 歩行距離 1m あたり。面積ポイントの 1/10 程度の体感になる想定。 */
    rescuePointsPerMeter: 0.01,
  },
} as const;

export type AreaBonusTier = (typeof CONFIG.scoring.areaBonusTiers)[number];
