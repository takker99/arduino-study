import { writeFile } from "node:fs/promises";
import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import { SerialPort } from "serialport";
import { R2_THRESHOLD, regress } from "./calibration/regression";
import { createStabilityDetector } from "./calibration/stability";
import type { Point } from "./types";

const REG_AVG = /avg=(-?\d+)/;

interface AppProps {
  portPath: string;
  interval: number;
  stableSpan: number;
  stableWindow: number;
  out: string;
  debug: boolean;
  onExit: () => void;
}

const displacementList = [0, 2, 4, 6, 8, 10, 12, 14];

export default function App({
  portPath,
  interval,
  stableSpan,
  stableWindow,
  out,
  debug,
  onExit,
}: AppProps) {
  const [port, setPort] = useState<SerialPort | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);
  const [measuring, setMeasuring] = useState(false);
  const [lastLine, setLastLine] = useState("");
  const [lastDataValue, setLastDataValue] = useState<number | null>(null);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const [autoCandidateMean, setAutoCandidateMean] = useState<number | null>(
    null,
  );
  const [autoSaved, setAutoSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [windowStats, setWindowStats] = useState<{
    span: number;
    min: number;
    max: number;
  } | null>(null);
  const [awaitingRecaptureDecision, setAwaitingRecaptureDecision] =
    useState(false);
  const [lastKeyInfo, setLastKeyInfo] = useState<{
    key: string;
    note?: string;
  } | null>(null);
  const [stability] = useState(() =>
    createStabilityDetector({
      threshold: stableSpan,
      windowSize: stableWindow,
    }),
  );
  const [provisionalResult, setProvisionalResult] = useState(regress(points));

  useEffect(() => {
    const p = new SerialPort({ baudRate: 9600, path: portPath });
    setPort(p);

    const requestStart = () => p.write(`START interval=${interval}\n`);

    let lineBuf = "";
    const handleLine = (line: string) => {
      setLastLine(line);
      if (line.startsWith("OK READY")) {
        requestStart();
      } else if (line.startsWith("OK START")) {
        setMeasuring(true);
      } else if (line.startsWith("OK STOP")) {
        setMeasuring(false);
      } else if (line.startsWith("DATA ")) {
        processDataLine(line);
      }
    };

    const processDataLine = (line: string) => {
      if (line.includes("status=NOT_READY")) {
        setLastStatus("NOT_READY");
      }
      const mAvg = REG_AVG.exec(line);
      if (!mAvg) return;
      const v = parseInt(mAvg[1], 10);
      setLastDataValue(v);
      if (lastStatus !== "NOT_READY") setLastStatus("OK");
      if (points.length >= displacementList.length) return;

      const stable = stability.push(v);
      if (!stable) {
        setAutoCandidateMean(null);
        setWindowStats(null);
        return;
      }
      setAutoCandidateMean(stable.mean);
      const samples = stable.samples as number[];
      const min = Math.min(...samples);
      const max = Math.max(...samples);
      setWindowStats({ max, min, span: max - min });
    };

    p.on("data", (buf: Buffer) => {
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

    // Initial start request
    setTimeout(() => {
      if (!measuring && points.length === 0) {
        requestStart();
      }
    }, 1500);

    return () => {
      if (p?.isOpen) {
        p.close();
      }
    };
  }, [portPath, interval, stability, lastStatus, measuring, points.length]);

  useEffect(() => {
    setProvisionalResult(regress(points));
    if (points.length === displacementList.length && !autoSaved) {
      const result = regress(points);
      if (result.r2 < R2_THRESHOLD) {
        setAwaitingRecaptureDecision(true);
      }
      const payload = {
        ...result,
        points,
        timestamp: new Date().toISOString(),
      };
      writeFile(out, JSON.stringify(payload, null, 2))
        .then(() => setSaveMessage(`Saved -> ${out}`))
        .catch((e) => setSaveMessage(`Save failed: ${(e as Error).message}`));

      if (result.r2 >= R2_THRESHOLD) {
        port?.write("STOP\n");
      }
      setAutoSaved(true);
    }
  }, [points, autoSaved, out, port]);

  useInput((input, key) => {
    const c = input;
    setLastKeyInfo({ key: c });

    if (key.ctrl && c === "c") {
      port?.write("STOP\n");
      onExit();
      return;
    }
    if (c === "q" || c === "Q") {
      port?.write("STOP\n");
      onExit();
      return;
    }

    if (c === "c") {
      if (
        autoCandidateMean != null &&
        points.length < displacementList.length
      ) {
        setPoints([
          ...points,
          { d: displacementList[currentTargetIndex], v: autoCandidateMean },
        ]);
        setCurrentTargetIndex(currentTargetIndex + 1);
        stability.reset();
        setAutoCandidateMean(null);
        setWindowStats(null);
        setLastKeyInfo({ key: "c", note: "captured" });
      } else {
        setLastKeyInfo({
          key: "c",
          note:
            autoCandidateMean == null ? "no stable window" : "already complete",
        });
      }
    } else if (c === "r") {
      stability.reset();
      setAutoCandidateMean(null);
      setWindowStats(null);
      setLastKeyInfo({ key: "r", note: "window reset" });
    } else if (awaitingRecaptureDecision && c === "R") {
      setPoints([]);
      setCurrentTargetIndex(0);
      setAwaitingRecaptureDecision(false);
      setAutoSaved(false);
      setSaveMessage(null);
      setLastKeyInfo({ key: "R", note: "redo all" });
    } else if (awaitingRecaptureDecision && c === "y") {
      setAwaitingRecaptureDecision(false);
      setLastKeyInfo({ key: "y", note: "accept low R2" });
    }
  });

  const st = stability.stats();

  return (
    <Box flexDirection="column">
      <Text>Calibration CLI (React Ink)</Text>
      <Text>
        Port: {portPath} interval={interval}ms measuring={String(measuring)}
      </Text>
      {debug && <Text>DEBUG mode ON</Text>}
      <Text>Target list (mm): {displacementList.join(", ")}</Text>
      <Text>
        Collected: {points.length}/{displacementList.length}
      </Text>
      <Text>Current target: {displacementList[currentTargetIndex] ?? "-"}</Text>
      <Text>Latest avg: {lastDataValue ?? "NA"}</Text>
      {lastStatus && <Text>Last status: {lastStatus}</Text>}
      {autoCandidateMean != null && (
        <Text>Stable candidate mean: {autoCandidateMean.toFixed(2)}</Text>
      )}
      {windowStats && (
        <Text>
          Window span={windowStats.span} min={windowStats.min} max=
          {windowStats.max}
        </Text>
      )}
      {provisionalResult && (
        <Box>
          <Text>
            Provisional: d = {provisionalResult.a.toFixed(6)} * V +{" "}
            {provisionalResult.b.toFixed(6)} R2=
            {provisionalResult.r2.toFixed(8)}
          </Text>
          {provisionalResult.r2 < R2_THRESHOLD && (
            <Text color="yellow">
              {" "}
              (!) R2 &lt; {R2_THRESHOLD} : consider re-capturing points
            </Text>
          )}
        </Box>
      )}
      {saveMessage && <Text>{saveMessage}</Text>}
      {awaitingRecaptureDecision && (
        <Text color="cyan">
          Decision: (y) accept low R2 & keep file (R) redo all points
        </Text>
      )}
      <Text>
        Stability: samples {st.len}/{stability.capacity()}
        {st.len > 0 ? ` span=${st.span} (thr<=${stableSpan})` : ""}
        {autoCandidateMean != null ? " candidate-ready" : ""}
      </Text>
      <Text>Last line: {lastLine.trim()}</Text>
      <Box marginTop={1}>
        <Text>
          Commands: (c)apture (r)eset-window (q)uit(STOP) (y)accept (R)edo-all
          (Ctrl+C) abort
        </Text>
      </Box>
      {autoCandidateMean != null && points.length < displacementList.length && (
        <Text color="green">
          Hint: Press 'c' to capture current stable mean for target{" "}
          {displacementList[currentTargetIndex]}
        </Text>
      )}
      {lastKeyInfo && (
        <Text>
          Last key: '{lastKeyInfo.key}'
          {lastKeyInfo.note ? ` (${lastKeyInfo.note})` : ""}
        </Text>
      )}
    </Box>
  );
}
