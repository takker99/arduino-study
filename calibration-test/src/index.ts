#!/usr/bin/env node

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

import { writeFile } from "node:fs/promises";
import { exit } from "node:process";
import { SerialPort } from "serialport";
import { R2_THRESHOLD, regress } from "./calibration/regression";
import { createStabilityDetector } from "./calibration/stability";
import { parseArgs, printUsage } from "./cli/args";
import { listAvailablePorts, selectPortInteractive } from "./cli/ports";
import type { Point } from "./types";

// 再利用する正規表現 (パフォーマンス/リンタ警告抑制)
const REG_AVG = /avg=(-?\d+)/;

// メイン (async でポート列挙/例外処理対応)
const opts = parseArgs();
if (!opts) {
  printUsage();
  await listAvailablePorts();
  exit(0);
}
if (!opts.port) {
  console.error(
    "--port 未指定のためインタラクティブ選択モードへ移行します。\n",
  );
  try {
    opts.port = await selectPortInteractive();
  } catch (e) {
    if ((e as Error).message === "User aborted") {
      exit(0); // 正常中断
    } else {
      console.error((e as Error).message);
      exit(1);
    }
  }
}
// opts はここから non-null
const options = opts;
let port: SerialPort;
try {
  port = new SerialPort({ baudRate: 9600, path: options.port });
} catch (e) {
  console.error(
    `シリアルポートオープン失敗 (${options.port}):`,
    (e as Error).message,
  );
  await listAvailablePorts();
  exit(1);
}

/** 取得する既知変位(mm) シーケンス */
const displacementList = [0, 2, 4, 6, 8, 10, 12, 14];
/** 安定判定器インスタンス */
const stability = createStabilityDetector({
  threshold: options.stableSpan,
  windowSize: options.stableWindow,
});
/** 収集済み (変位, 平均センサー値) ペア */
const points: Point[] = [];

let currentTargetIndex = 0;
let measuring = false;
let lastLine = "";
let lastDataValue: number | null = null;
let lastStatus: string | null = null;
let autoCandidateMean: number | null = null;
let autoSaved = false;
let saveMessage: string | null = null;
let windowStats: { span: number; min: number; max: number } | null = null;
let awaitingRecaptureDecision = false; // R2未達時 再取得するかユーザー判断
let exiting = false; // gracefulExit 呼び出し済
let lastKeyInfo: { key: string; note?: string; ts: number } | null = null;
let lastRenderTime = 0;

/** 暫定回帰 (まだ点が無ければ null) */
function provisionalRegression() {
  if (!points.length) return null;
  return regress(points);
}

/** 必要全点取得時に回帰計算 & JSON保存。R2未達なら再取得判断フラグを立てる */
async function finalizeIfComplete() {
  if (points.length === displacementList.length && !autoSaved) {
    const result = regress(points);
    if (result.r2 < R2_THRESHOLD) {
      // ユーザーに再取得意思確認 (y=確定保存 / R=全部やり直し)
      awaitingRecaptureDecision = true;
    }
    try {
      const payload = {
        ...result,
        points,
        timestamp: new Date().toISOString(),
      };
      await writeFile(options.out, JSON.stringify(payload, null, 2));
      saveMessage = `Saved -> ${options.out}`;
    } catch (e) {
      saveMessage = `Save failed: ${(e as Error).message}`;
    }
    if (result.r2 >= R2_THRESHOLD) {
      port.write("STOP\n");
    }
    autoSaved = true;
  }
}

// UI描画
const screen = {
  render() {
    const now = Date.now();
    // throttle normal renders to 100ms (forced renders bypass)
    if (!forceRender && now - lastRenderTime < 100) return;
    lastRenderTime = now;
    process.stdout.write("\x1b[2J\x1b[H"); // clear
    console.log("Calibration CLI (MVP)");
    console.log(
      `Port: ${options.port}  interval=${options.interval}ms  measuring=${measuring}`,
    );
    if (options.debug) console.log("DEBUG mode ON");
    console.log("Target list (mm):", displacementList.join(","));
    console.log(`Collected: ${points.length}/${displacementList.length}`);
    console.log("Current target:", displacementList[currentTargetIndex] ?? "-");
    console.log("Latest avg:", lastDataValue ?? "NA");
    if (lastStatus) console.log("Last status:", lastStatus);
    if (autoCandidateMean != null)
      console.log("Stable candidate mean:", autoCandidateMean.toFixed(2));
    if (windowStats)
      console.log(
        `Window span=${windowStats.span} min=${windowStats.min} max=${windowStats.max}`,
      );
    const reg = provisionalRegression();
    if (reg) {
      console.log(
        `Provisional: d = ${reg.a.toFixed(6)} * V + ${reg.b.toFixed(6)}  R2=${reg.r2.toFixed(8)}`,
      );
      if (reg.r2 < R2_THRESHOLD) {
        console.log(`(!) R2 < ${R2_THRESHOLD} : consider re-capturing points`);
      } else if (points.length === displacementList.length) {
        console.log(
          `R2 threshold met (>= ${R2_THRESHOLD}) -> auto STOP after save`,
        );
      }
    }
    if (saveMessage) console.log(saveMessage);
    if (awaitingRecaptureDecision) {
      console.log(
        "Decision: (y) accept low R2 & keep file  (R) redo all points",
      );
    }
    // Stability progress
    const st = stability.stats();
    console.log(
      `Stability: samples ${st.len}/${stability.capacity()}` +
        (st.len > 0 ? ` span=${st.span} (thr<=${options.stableSpan})` : "") +
        (autoCandidateMean != null ? " candidate-ready" : ""),
    );
    console.log("Last line:", lastLine.trim());
    console.log(
      "Commands: (c)apture  (r)eset-window  (q)uit(STOP)  (y)accept  (R)edo-all  (Ctrl+C) abort",
    );
    if (autoCandidateMean != null && points.length < displacementList.length) {
      console.log(
        "Hint: Press 'c' to capture current stable mean for target",
        displacementList[currentTargetIndex],
      );
    }
    if (lastKeyInfo && now - lastKeyInfo.ts < 2000) {
      console.log(
        `Last key: '${lastKeyInfo.key}'` +
          (lastKeyInfo.note ? ` (${lastKeyInfo.note})` : ""),
      );
    }
  },
};
let forceRender = false;
function triggerRender(force = false) {
  forceRender = force;
  screen.render();
  forceRender = false;
}

/** Arduinoへ START 指令送信 */
function requestStart() {
  port.write(`START interval=${options.interval}\n`);
}
/** Arduinoへ STOP 指令送信 */
function requestStop() {
  port.write("STOP\n");
}

/** stdin復元とポートクローズを行いプロセス終了 (多重防止付き) */
function gracefulExit(code = 0) {
  if (exiting) return;
  exiting = true;
  try {
    process.stdin.setRawMode(false);
  } catch {}
  process.stdin.pause();
  try {
    if (port.isOpen) {
      port.close(() => {
        console.log("\nExiting...\n");
        exit(code);
      });
      return;
    }
  } catch {}
  console.log("\nExiting...\n");
  exit(code);
}

// READY が来なかった/取りこぼした場合の冗長再送 (ボードリセット遅延対策)
setTimeout(() => {
  if (!measuring && points.length === 0) {
    requestStart();
  }
}, 1500);

// 受信処理
port.on("data", (buf: Buffer) => {
  const text = buf.toString("utf8");
  for (const ch of text) {
    if (ch === "\n") {
      handleLine(lineBuf);
      lineBuf = "";
    } else if (ch !== "\r") {
      lineBuf += ch;
      if (lineBuf.length > 256) lineBuf = "";
    }
  }
});
let lineBuf = "";

function onOkReady() {
  requestStart();
}
function onOkStart() {
  measuring = true;
}
function onOkStop() {
  measuring = false;
}

/** DATA 行を解析し avg を抽出して安定判定 */
function processDataLine(line: string) {
  if (line.includes("status=NOT_READY")) {
    lastStatus = "NOT_READY";
  }
  const mAvg = REG_AVG.exec(line);
  if (!mAvg) return;
  const v = parseInt(mAvg[1], 10);
  lastDataValue = v;
  if (lastStatus !== "NOT_READY") lastStatus = "OK";
  if (points.length >= displacementList.length) return;
  const stable = stability.push(v);
  if (!stable) return;
  autoCandidateMean = stable.mean;
  const samples = stable.samples as number[];
  let min = Infinity;
  let max = -Infinity;
  for (const s of samples) {
    if (s < min) min = s;
    if (s > max) max = s;
  }
  windowStats = { max, min, span: max - min };
}

/** プロトコル1行を分類処理 */
function handleLine(line: string) {
  lastLine = line;
  if (line.startsWith("OK READY")) {
    onOkReady();
  } else if (line.startsWith("OK START")) {
    onOkStart();
  } else if (line.startsWith("OK STOP")) {
    onOkStop();
    if (exiting) gracefulExit(0);
  } else if (line.startsWith("ERR STOP")) {
    // NOT_MEASURING など: quit中ならそのまま終了
    if (exiting) gracefulExit(0);
  } else if (line.startsWith("DATA ")) {
    processDataLine(line);
  }
  finalizeIfComplete();
  triggerRender();
}

// キー入力
if (!process.stdin.isRaw) {
  try {
    process.stdin.setRawMode(true);
  } catch {}
}
process.stdin.resume();
process.stdin.on("data", (data: Buffer) => {
  const c = data.toString("utf8");
  if (options.debug) {
    const hex = [...data.values()]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
    const cps = [...c].map((ch) => ch.codePointAt(0)?.toString(16)).join(",");
    console.error(
      `[key] raw='${c.replace(/\n/g, "\\n").replace(/\r/g, "\\r")}'; bytes=${data.length}; hex=${hex}; cps=${cps}`,
    );
  }
  if (c === "\x03") {
    // Ctrl+C -> 正常終了扱い
    gracefulExit(0);
    return;
  }
  if (c === "q" || c === "Q") {
    // STOP送信してもNOT_MEASURINGエラーになる可能性があるので即EXITにフォールバック
    if (measuring && !exiting) {
      requestStop();
      setTimeout(() => gracefulExit(0), 300); // 300ms待って反応なければ終了
    } else {
      gracefulExit(0);
    }
    return;
  } else if (c === "c") {
    if (autoCandidateMean == null) {
      if (options.debug)
        console.error("[capture] ignored: no stable window yet");
      lastKeyInfo = { key: "c", note: "no stable window", ts: Date.now() };
    } else if (points.length >= displacementList.length) {
      if (options.debug) console.error("[capture] ignored: already complete");
      lastKeyInfo = { key: "c", note: "already complete", ts: Date.now() };
    } else {
      points.push({
        d: displacementList[currentTargetIndex],
        v: autoCandidateMean,
      });
      currentTargetIndex++;
      stability.reset();
      autoCandidateMean = null;
      windowStats = null;
      finalizeIfComplete();
      lastKeyInfo = { key: "c", note: "captured", ts: Date.now() };
    }
  } else if (c === "r") {
    stability.reset();
    autoCandidateMean = null;
    windowStats = null;
    lastKeyInfo = { key: "r", note: "window reset", ts: Date.now() };
  } else if (awaitingRecaptureDecision && c === "R") {
    // 全部やり直し
    points.length = 0;
    currentTargetIndex = 0;
    awaitingRecaptureDecision = false;
    autoSaved = false; // 再度保存可能
    saveMessage = null;
    lastKeyInfo = { key: "R", note: "redo all", ts: Date.now() };
  } else if (awaitingRecaptureDecision && c === "y") {
    // 低R2受諾
    awaitingRecaptureDecision = false;
    lastKeyInfo = { key: "y", note: "accept low R2", ts: Date.now() };
  } else if (c === "y") {
    lastKeyInfo = {
      key: "y",
      note: "ignored (not awaiting)",
      ts: Date.now(),
    };
  } else {
    // Any other key
    lastKeyInfo = {
      key: c.split("\u001b").join("<ESC>"),
      note: "unmapped",
      ts: Date.now(),
    };
  }
  triggerRender(true);
});

// 初期描画
triggerRender(true);
