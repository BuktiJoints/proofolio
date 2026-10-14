import { env } from "@/server/env";
import { processOne } from "./processor";

const workerId = `${process.pid}-${crypto.randomUUID()}`; let stopping = false;
process.on("SIGTERM", () => stopping = true); process.on("SIGINT", () => stopping = true);
console.log(JSON.stringify({ level: "info", message: "worker_started", workerId }));
while (!stopping) {
  try { const worked = await processOne(workerId); if (!worked) await new Promise((resolve) => setTimeout(resolve, env().WORKER_POLL_MS)); }
  catch (error) { console.error(JSON.stringify({ level: "error", message: "worker_loop_error", error: error instanceof Error ? error.message : String(error) })); await new Promise((resolve) => setTimeout(resolve, env().WORKER_POLL_MS)); }
}
console.log(JSON.stringify({ level: "info", message: "worker_stopped", workerId }));
