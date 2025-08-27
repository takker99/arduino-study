import { argv } from "node:process";
import type { Options } from "../types";
import { listAvailablePorts } from "./ports";

/** CLIヘルプを標準エラーへ出力 */
export function printUsage() {
  const s = `Usage: calibration-cli --port <device> [--interval <ms>] [--out <file>]
Options:
  --port <device>     シリアルデバイスパス (例: /dev/ttyACM0)
  --interval <ms>     サンプリング間隔 (デフォルト 50)
  --out <file>        結果JSON出力ファイル (デフォルト calibration.json)
  --stable-span <N>   安定判定の max-min 閾値 (デフォルト 1000)
  --stable-window <N> サンプル窓サイズ (デフォルト 40)
  --debug             追加デバッグ出力
  -h, --help          このヘルプを表示

Tips:
  デバイスが見つからない場合は USB ケーブル/権限 (dialout グループ) を確認してください。
`;
  console.error(s);
}

/** argv を解析して Options を返す。-h/--help を含む場合 null。 */
export function parseArgs(): Options | null {
  const opts: Options = {
    debug: false,
    interval: 50,
    out: "calibration.json",
    port: "",
    stableSpan: 1000,
    stableWindow: 40,
  };
  for (let i = 2; i < argv.length; ++i) {
    const a = argv[i];
    if (a === "--port") opts.port = argv[++i] ?? "";
    else if (a === "--interval")
      opts.interval = parseInt(argv[++i] ?? "50", 10);
    else if (a === "--out") opts.out = argv[++i] ?? opts.out;
    else if (a === "--debug") opts.debug = true;
    else if (a === "--stable-span")
      opts.stableSpan = parseInt(argv[++i] ?? "1000", 10);
    else if (a === "--stable-window")
      opts.stableWindow = parseInt(argv[++i] ?? "40", 10);
    else if (a === "-h" || a === "--help") return null;
  }
  return opts;
}

/** 引数解析結果が null (help) の場合ヘルプとポート一覧を出す */
export async function maybeShowHelpAndListPorts(opts: Options | null) {
  if (opts) return;
  printUsage();
  await listAvailablePorts();
}
