# 変位変換器 (DTH-A-5 + HX711) 校正手順 / 実装骨子

> 状態: Skeleton (初稿) / 実装リファレンス用。詳細 & 図表は実機測定後に追記。

## 1. 目的
- DTH-A-5 変位センサー (ブリッジ) を HX711 経由で Arduino UNO R4 Wi-Fi から読み取り、既知厚さブロックによる多点校正で線形モデル $d = aV + b$ を確立。
- 得られた係数 $a,b$ と決定係数 $R^2$ を PC 側 CLI で算出し JSON に保存。

## 2. システム概要
- マイコン: Arduino UNO R4 Wi-Fi
- A/D: HX711 (ゲイン128想定)
- 通信: USBシリアル 9600bps (必要なら将来 57600/115200 へ)
- 表示: 内蔵 LED マトリクス (符号+2桁表示)
- PC ツール: TypeScript CLI (Web Streams 指向, serialport 利用)

## 3. シリアル簡易RPCプロトコル (MVP)
| 方向 | コマンド / 行 | 説明 |
|------|----------------|------|
> 注: MCU は "Microcontroller Unit"（マイコン、マイクロコントローラ）の略です。
| PC→MCU | `START interval=<ms>` | 測定開始 (20〜1000ms) |
| PC→MCU | `STOP` | 測定停止 |
| MCU→PC | `OK START` / `OK STOP` | 状態遷移成功 |
| MCU→PC | `ERR <CMD> code=<n> msg=<text>` | エラー応答 (未使用コマンド等) |
| MCU→PC | `DATA t=<ms> raw=<v> avg=<v>` | 測定データ行 (NOT_READY時は `status=NOT_READY`) |
| MCU→PC | `OK READY` | 起動完了合図 |

将来拡張候補: `VERSION`, `PING`, `SAVE_CAL`, `LOAD_CAL`。

## 4. Arduino 側実装要点
- 状態: `Idle` / `Measuring`
- 行バッファ 64B, 改行終端でパース
- HX711 読み取り: `read_average(10)` (ノイズ平滑)
- NOT_READY 時はデータ欠損扱いで行送出 (クライアント側で再評価)
- LED: 下位2桁 + 符号 (|値|>99 => `--`)

## 5. PC CLI 校正フロー
1. シリアル接続 → `OK READY` 待機
2. `START interval=N` 送信
3. ストリーム表示 & 安定判定 (初期設計: 窓=40, span≤40 → 実機ノイズを踏まえ span デフォルト 1000 に緩和)
4. 安定候補確定 → ユーザーが `c` Capture (全 8 点: 0,2,4,6,8,10,12,14 mm 仮)
5. 全点取得 → 回帰 (最小二乗法) → $a,b,R^2$ 計算 & JSON 保存
6. $R^2 \ge 0.99999$ で自動 STOP。未達ならユーザーが (y)=受諾 or (R)=再取得

## 6. 数式
最小二乗法 (単回帰) で $d = aV + b$ を推定:

$$
a = \frac{\sum_{i=1}^n (V_i - \bar V)(d_i - \bar d)}{\sum_{i=1}^n (V_i - \bar V)^2},\qquad
b = \bar d - a\bar V
$$

決定係数:

$$
R^2 = 1 - \frac{\sum_{i=1}^n (d_i - (aV_i + b))^2}{\sum_{i=1}^n (d_i - \bar d)^2}
$$

## 7. 安定判定アルゴリズム
- リングバッファ (長さ W=40)
- 追加毎に min/max/mean を O(W) (将来 O(1) 最適化: monotonic deque)
- 条件成立時: 平均値を候補 & ウィンドウ統計 (span, min, max) 表示

現行デフォルト値 (詳細: [`stability-parameters.md`](./stability-parameters.md)):
| パラメータ | デフォルト | 目的 |
|------------|------------|------|
| stable-window (W) | 40 | 約2秒相当 (50ms間隔想定) の短期安定性評価 |
| stable-span (Δ) | 1000 | 実測ノイズ (span≈750–800) を包含し過剰再試行を防止 |

チューニング指針:
1. 生ノイズ span を UI の Window span 行で観察
2. 期待値: Δ が典型ノイズspanの 1.1〜1.3倍程度
3. Δ を下げて R² が悪化する場合は外れ値除去導入を検討
4. W を増やすと平均分散は低下するが応答遅延が増える (再配置作業時間とトレードオフ)

改善余地: 外れ値除去(IQR/Z-score), 分散閾値併用, 自動デルタ調整, 動的ウィンドウ拡縮。

CLI フラグで変更可能:
```
--stable-span <N>
--stable-window <N>
```

## 8. CLI オプション & 実行

| オプション | 説明 | 例 |
|------------|------|----|
| --port <path> | シリアルポート (未指定でインタラクティブ選択) | --port /dev/ttyACM0 |
| --interval <ms> | サンプリング間隔 (Arduino START interval=) | --interval 50 |
| --out <file> | 結果JSON出力 | --out result/calib.json |
| --stable-span <N> | 安定判定 span 閾値 Δ | --stable-span 800 |
| --stable-window <N> | 安定判定窓サイズ W | --stable-window 60 |
| --debug | 低レベルキー入力 / 解析ログ | --debug |

起動例:
```
calibration-cli --interval 50 --stable-span 900 --stable-window 40 --out calib-20250827.json
```

## 9. モジュール構成 (リファクタ後)
| ファイル | 役割 |
|----------|------|
| `src/index.ts` | エントリポイント / UI ループ |
| `src/types.ts` | 共有型定義 (Options, Point, RegressionResult) |
| `src/cli/args.ts` | 引数解析 / ヘルプ表示 |
| `src/cli/ports.ts` | ポート列挙 / インタラクティブ選択 |
| `src/calibration/stability.ts` | 安定判定器 (window, span) |
| `src/calibration/regression.ts` | 最小二乗 & R² 閾値定義 |
| `knowledge/stability-parameters.md` | 安定判定パラメータ詳細 |
| `knowledge/led-display.md` | LED表示仕様 |

責務分離効果: テスト容易性 / 視認性向上 / 将来GUI転用時の再利用性向上。

## 10. ファイル出力フォーマット (例)
```json
{
  "a": 0.0123456,
  "b": -1.234,
  "r2": 0.9999923,
  "points": [ {"d":0, "v":123456}, {"d":2, "v":124001} ],
  "timestamp": "2025-08-27T12:34:56.789Z"
}
```

## 11. トラブルシュート初期メモ
| 症状 | 可能原因 | 対策 |
|------|----------|------|
| `status=NOT_READY` 頻発 | レート過大 / 配線揺らぎ | interval拡大 / 配線再確認 |
| $R^2$ 低い | 点数少 / ノイズ / ドリフト | interval増/再校正/温度安定待ち |
| LED `--` ばかり | 値スケール大 | 表示スケール再設計 or 補正適用 |
| キャプチャ安定しない | threshold低すぎ | Δ値/窓長調整 |

## 12. 今後の拡張候補
- EEPROM 係数保存 (署名+CRC)
- Web Serial UI / グラフ描画
- オフライン再回帰 (履歴CSV化)
- 外れ値除去 + 自動 $R^2$ 改善サジェスト
- ノイズスペクトル推定 (FFTによるレート最適化)

## 13. 作業ログリンク
- 初回MVP 実装コミット: (後でハッシュ追記)
- CLI 改善 (R²再取得フロー): (追記予定)

---
(追記予定セクション)
- 実測ノイズ統計
- センサー仕様抜粋 (DTH-A-5 datasheet要点)
- 最適パラメータチューニング履歴
