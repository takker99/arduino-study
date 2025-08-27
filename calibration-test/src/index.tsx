import { exit } from "node:process";
import { render } from "ink";
import App from "./App";
import { parseArgs, printUsage } from "./cli/args";
import { listAvailablePorts, selectPortInteractive } from "./cli/ports";

async function main() {
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
  const options = opts;

  const { unmount } = render(
    <App
      debug={options.debug ?? false}
      interval={options.interval}
      onExit={() => {
        unmount();
        exit(0);
      }}
      out={options.out}
      portPath={options.port}
      stableSpan={options.stableSpan}
      stableWindow={options.stableWindow}
    />,
  );
}

main();
