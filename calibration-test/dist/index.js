#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { argv, exit } from "node:process";
/**
 * Calibration CLI MVP
 * 要件:
 *  - 9600bpsでArduinoに接続
 *  - START interval=50 を送りDATAストリームを受信
 *  - 生データをリアルタイムで画面再描画
 *  - 8点校正: 仮の変位 mm リスト [0,2,4,6,8,10,12,14]
 *  - 安定判定: 窓長2s相当、max-min <= 40
 *  - 確定後最小二乗法で a,b,R^2 を算出し JSON 保存
 *  - CLI引数: --port <path> --interval <ms> --out <file>
 *  - Node.js専用APIを極力避け Web Streams に寄せる (ただし serialport 利用部分は例外)
 */
import { SerialPort } from "serialport";

function parseArgs() {
  const opts = { interval: 50, out: "calibration.json", port: "" };
  for (let i = 2; i < argv.length; ++i) {
    const a = argv[i];
    if (a === "--port") opts.port = argv[++i] ?? "";
    else if (a === "--interval")
      opts.interval = parseInt(argv[++i] ?? "50", 10);
    else if (a === "--out") opts.out = argv[++i] ?? opts.out;
  }
  if (!opts.port) {
    console.error("ERROR: --port <device> required");
    exit(1);
  }
  return opts;
}
// 安定判定器 (max-min <= threshold の窓が成立したら平均を返す)
function createStabilityDetector({ windowSize, threshold }) {
  const values = [];
  return {
    push(v) {
      values.push(v);
      if (values.length > windowSize) values.shift();
      if (values.length < windowSize) return null;
      let min = Infinity,
        max = -Infinity,
        sum = 0;
      for (const x of values) {
        if (x < min) min = x;
        if (x > max) max = x;
        sum += x;
      }
      if (max - min <= threshold) {
        return { mean: sum / values.length, samples: [...values] };
      }
      return null;
    },
    reset() {
      values.length = 0;
    },
  };
}
function regress(points) {
  const n = points.length;
  const sumV = points.reduce((a, p) => a + p.v, 0);
  const sumD = points.reduce((a, p) => a + p.d, 0);
  const meanV = sumV / n;
  const meanD = sumD / n;
  let num = 0,
    den = 0,
    ssRes = 0,
    ssTot = 0;
  for (const p of points) {
    num += (p.v - meanV) * (p.d - meanD);
    den += (p.v - meanV) * (p.v - meanV);
  }
  const a = num / den;
  const b = meanD - a * meanV;
  for (const p of points) {
    const pred = a * p.v + b;
    const err = p.d - pred;
    ssRes += err * err;
    const diffD = p.d - meanD;
    ssTot += diffD * diffD;
  }
  const r2 = 1 - ssRes / ssTot;
  return { a, b, r2 };
}
async function main() {
  const opts = parseArgs();
  const port = new SerialPort({ baudRate: 9600, path: opts.port });
  console.log(`[info] Open ${opts.port} @9600`);
  const displacementList = [0, 2, 4, 6, 8, 10, 12, 14];
  const stability = createStabilityDetector({ threshold: 40, windowSize: 40 });
  const points = [];
  let currentTargetIndex = 0;
  let measuring = false;
  let lastLine = "";
  let lastDataValue = null;
  // 画面リフレッシュ: Terminal再描画 (最小限)
  const screen = {
    render() {
      process.stdout.write("\x1b[2J\x1b[H"); // clear
      console.log("Calibration CLI (MVP)");
      console.log("Target points (mm):", displacementList.join(","));
      console.log(`Collected: ${points.length}/${displacementList.length}`);
      console.log(
        "Current target (mm):",
        displacementList[currentTargetIndex] ?? "-",
      );
      console.log("Latest raw avg:", lastDataValue ?? "NA");
      console.log("Last line:", lastLine.trim());
      if (points.length) {
        const { a, b, r2 } = regress(points);
        console.log(
          `Provisional regression: d = ${a.toFixed(6)} * V + ${b.toFixed(6)} (R2=${r2.toFixed(8)})`,
        );
      }
      console.log(
        "Commands: (c)apture confirm  (r)eject/reset window  (q)uit after STOP",
      );
    },
  };
  function requestStart() {
    port.write(`START interval=${opts.interval}\n`);
  }
  function requestStop() {
    port.write("STOP\n");
  }
  port.on("data", (buf) => {
    const text = buf.toString("utf8");
    for (const ch of text) {
      if (ch === "\n") {
        handleLine(lineBuf);
        lineBuf = "";
      } else if (ch !== "\r") {
        lineBuf += ch;
        if (lineBuf.length > 256) lineBuf = ""; // overflow guard
      }
    }
  });
  let lineBuf = "";
  function handleLine(line) {
    lastLine = line;
    if (line.startsWith("OK READY")) {
      requestStart();
    } else if (line.startsWith("OK START")) {
      measuring = true;
    } else if (line.startsWith("OK STOP")) {
      measuring = false;
    } else if (line.startsWith("DATA ")) {
      // parse key=val tokens
      const mT = /t=(\d+)/.exec(line);
      const mRaw = /raw=(-?\d+)/.exec(line);
      const mAvg = /avg=(-?\d+)/.exec(line);
      if (mAvg) {
        const v = parseInt(mAvg[1], 10);
        lastDataValue = v;
        const stable = stability.push(v);
        if (stable && points.length < displacementList.length) {
          // 自動候補: 安定を検出したらユーザーに capture 提示だけでなく即表示
          autoCandidateMean = stable.mean;
        }
      }
    }
    screen.render();
  }
  // 自動候補値
  let autoCandidateMean = null;
  // キーボード入力
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on("data", (data) => {
    const c = data.toString("utf8");
    if (c === "q") {
      requestStop();
    } else if (c === "c") {
      if (
        autoCandidateMean != null &&
        points.length < displacementList.length
      ) {
        const d = displacementList[currentTargetIndex];
        points.push({ d, v: autoCandidateMean });
        currentTargetIndex++;
        stability.reset();
        autoCandidateMean = null;
        if (points.length === displacementList.length) {
          const result = regress(points);
          writeFile(opts.out, JSON.stringify({ ...result, points }, null, 2));
        }
      }
    } else if (c === "r") {
      stability.reset();
      autoCandidateMean = null;
    }
    screen.render();
  });
  // 初期画面
  screen.render();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
