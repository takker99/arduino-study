import { SerialPort } from "serialport";

export async function listAvailablePorts() {
  try {
    const ports = await SerialPort.list();
    if (!ports.length) {
      console.error("検出されたシリアルポートはありません。");
      console.error(
        "例: ls /dev/ttyACM* /dev/ttyUSB* で手動確認してください。",
      );
      return;
    }
    console.error("利用可能なポート一覧:");
    for (const p of ports) {
      const vidpid = [p.vendorId, p.productId].filter(Boolean).join(":");
      console.error(`  ${p.path}  ${vidpid ? "[" + vidpid + "]" : ""}`);
    }
  } catch (e) {
    console.error("ポート列挙に失敗:", (e as Error).message);
  }
}

export async function selectPortInteractive(rescanMs = 3000): Promise<string> {
  let ports: Awaited<ReturnType<typeof SerialPort.list>> = [];
  let selectedIndex = 0;
  let stop = false;
  let lastRender = 0;

  async function refresh() {
    try {
      ports = await SerialPort.list();
      if (selectedIndex >= ports.length) selectedIndex = 0;
    } catch {
      // ignore
    }
  }

  function render(force = false) {
    const now = Date.now();
    if (!force && now - lastRender < 200) return; // throttle
    lastRender = now;
    process.stdout.write("\x1b[2J\x1b[H");
    console.log("[Port Selection]");
    if (!ports.length) {
      console.log(
        "Arduino が接続されていません。USBケーブル/電源/権限(dialout)を確認してください。",
      );
      console.log("接続後 自動で一覧に反映されます...");
    } else {
      console.log("上下キー/ j k : 選択  Enter: 決定  r:再読み込み  q:終了");
      ports.forEach((p, i) => {
        const marker = i === selectedIndex ? ">" : " ";
        const vidpid = [p.vendorId, p.productId].filter(Boolean).join(":");
        console.log(
          `${marker} [${i}] ${p.path} ${vidpid ? "(" + vidpid + ")" : ""}`,
        );
      });
    }
    console.log("スキャン間隔:", rescanMs, "ms (自動更新)");
  }

  await refresh();
  render(true);

  const interval = setInterval(async () => {
    const prevPaths = ports.map((p) => p.path).join();
    await refresh();
    const nextPaths = ports.map((p) => p.path).join();
    if (prevPaths !== nextPaths) render(true);
    else render();
    if (stop) clearInterval(interval);
  }, rescanMs);

  return await new Promise<string>((resolve, reject) => {
    const onData = (data: Buffer) => {
      const c = data.toString("utf8");
      // Abort keys
      if (c === "q" || c === "Q" || c === "\x03" || c === "\x1b") {
        cleanup();
        reject(new Error("User aborted"));
        return;
      }
      if (c === "r") {
        refresh().then(() => render(true));
        return;
      }
      if (c === "j" || c === "\x1b[B") {
        if (ports.length) selectedIndex = (selectedIndex + 1) % ports.length;
        render(true);
        return;
      }
      if (c === "k" || c === "\x1b[A") {
        if (ports.length)
          selectedIndex = (selectedIndex - 1 + ports.length) % ports.length;
        render(true);
        return;
      }
      if (c === "\r") {
        if (ports.length) {
          const chosen = ports[selectedIndex].path;
          cleanup();
          resolve(chosen);
        }
        return;
      }
    };
    function cleanup() {
      stop = true;
      clearInterval(interval);
      process.stdin.off("data", onData);
      try {
        process.stdin.setRawMode(false);
      } catch {}
      process.stdin.pause();
    }
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", onData);
  });
}
