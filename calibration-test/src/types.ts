/**
 * 校正CLIで共有される型定義。
 * Options: CLI引数により決まる設定セット
 * RegressionResult: 線形回帰の結果 (d = a*V + b)
 * Point: 単一の既知変位と平均センサー値の対応
 */
export interface Options {
  /** シリアルポートパス。未指定ならインタラクティブ選択 */
  port: string;
  /** サンプリング間隔(ms) STARTコマンドへ反映 */
  interval: number;
  /** 回帰結果を保存するJSONファイルパス */
  out: string;
  /** 追加デバッグログ出力フラグ */
  debug?: boolean;
  /** 安定判定の (max-min) 閾値 */
  stableSpan: number;
  /** 安定判定の窓サンプル数 */
  stableWindow: number;
}

export interface RegressionResult {
  /** 傾き a */
  a: number;
  /** 切片 b */
  b: number;
  /** 決定係数 R^2 */
  r2: number;
}

export interface Point {
  /** 既知の物理変位 (mm) */
  d: number; // displacement (mm)
  /** 安定平均を取ったセンサー値 */
  v: number; // sensor raw/avg value
}
