import type { PluginServerContext } from "@getpaseo/plugin/server";
import { randomUUID } from "node:crypto";
import { startEnhancement, enhancementStatus } from "./shared/enhance";
import { preferences } from "./shared/settings";
import { runEnhancement } from "./server/enhance";

export default function contribute(server: PluginServerContext): () => void {
  const settings = server.registerSettings(preferences);
  type Operation = { status: "running" } | { status: "complete"; text: string } | { status: "error"; message: string };
  const operations = new Map<string, Operation>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  server.handle(startEnhancement, async (input, { paseo }) => {
    const current = await settings.read();
    if (current.status !== "ready") throw new Error(`Prompt Enhancer settings are invalid: ${current.error}`);
    const operationId = randomUUID();
    operations.set(operationId, { status: "running" });
    void runEnhancement(paseo, input, current.values).then(
      (text) => { operations.set(operationId, { status: "complete", text }); },
      (error: unknown) => { operations.set(operationId, { status: "error", message: error instanceof Error ? error.message : String(error) }); },
    ).finally(() => {
      const timer = setTimeout(() => { operations.delete(operationId); timers.delete(timer); }, 300_000);
      timers.add(timer);
    });
    return { operationId };
  });
  server.handle(enhancementStatus, ({ operationId }) => {
    const operation = operations.get(operationId);
    if (!operation) throw new Error("The enhancement is no longer available.");
    return operation;
  });
  return () => { for (const timer of timers) clearTimeout(timer); operations.clear(); };
}
