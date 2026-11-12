import assert from "node:assert/strict";
import { test } from "node:test";
import type { PluginServerContext } from "@getpaseo/plugin/server";
import contribute from "../index.server";
import { settingsSchema } from "../shared/settings";

test("a result arriving after teardown does not recreate operation state", async () => {
  let finish: ((value: unknown) => void) | undefined;
  const pending = new Promise<unknown>((resolve) => { finish = resolve; });
  const handlers = new Map<string, (input: unknown, context: unknown) => unknown>();
  const server = {
    registerSettings: () => ({ read: async () => ({ status: "ready", values: settingsSchema.parse({ provider: "codex", model: "model" }) }) }),
    handle: (contract: { name: string }, handler: (input: unknown, context: unknown) => unknown) => { handlers.set(contract.name, handler); },
  };
  // The fake implements the server registration methods used by the contribution.
  const cleanup = contribute(server as unknown as PluginServerContext);
  const api = { workspaces: { ref: () => ({ agents: { create: async () => ({ waitForFinish: () => pending, archive: async () => undefined }) } }) } };
  const start = handlers.get("enhance.start");
  const status = handlers.get("enhance.status");
  assert.ok(start && status && finish);
  const result = await start({ workspaceId: "w", agentId: "a", draft: "x", instruction: "y", historyLimit: 0, includeTools: false }, { paseo: api });
  assert.ok(result && typeof result === "object" && "operationId" in result && typeof result.operationId === "string");
  cleanup();
  finish({ status: "idle", lastMessage: "done", error: null });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.throws(() => status({ operationId: result.operationId }, {}), /no longer available/);
});
