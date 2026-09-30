import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync } from "node:fs";
import { join } from "node:path";

const logDir = join(process.cwd(), "logs");
mkdirSync(logDir, { recursive: true });
const log = createWriteStream(join(logDir, "dev.log"), { flags: "w" });
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--port", "5001"], {
  stdio: ["inherit", "pipe", "pipe"],
});

for (const stream of [child.stdout, child.stderr]) {
  stream.on("data", (chunk) => {
    process.stdout.write(chunk);
    log.write(chunk);
  });
}

let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    if (process.platform === "win32" && child.pid) {
      spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true }).on("error", () => child.kill());
    } else child.kill(signal);
  });
}

child.on("error", (error) => console.error("[dev-with-log] start failed:", error));
child.on("close", (code) => log.end(() => { process.exitCode = stopping ? 0 : code ?? 1; }));
