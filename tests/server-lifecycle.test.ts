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

test("visibility subscribers receive the saved value and changes, then unsubscribe", async () => {
  let listener: ((state: unknown) => void) | undefined;
  let released = false;
  const handlers = new Map<string, (input: unknown, context: unknown) => unknown>();
  const server = {
    registerSettings: () => ({
      read: async () => ({ status: "ready", values: settingsSchema.parse({ showAdvanced: false }) }),
      subscribe: (callback: (state: unknown) => void) => { listener = callback; return () => { released = true; }; },
    }),
    handle: (contract: { name: string }, handler: (input: unknown, context: unknown) => unknown) => { handlers.set(contract.name, handler); },
  };
  // The fake implements the server registration methods used by the contribution.
  const cleanup = contribute(server as unknown as PluginServerContext);
  const handler = handlers.get("preferences.visibility");
  assert.ok(handler);
  const controller = new AbortController();
  const events: unknown[] = [];
  handler({}, { signal: controller.signal, push: async (event: unknown) => { events.push(event); } });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(events, [{ showAdvanced: false, quickLabel: "Prompt Import", advancedLabel: "Prompt Advance" }]);
  assert.ok(listener);
  listener({ status: "ready", values: settingsSchema.parse({ showAdvanced: true, quickLabel: "Rewrite", advancedLabel: "Options" }) });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(events, [{ showAdvanced: false, quickLabel: "Prompt Import", advancedLabel: "Prompt Advance" }, { showAdvanced: true, quickLabel: "Rewrite", advancedLabel: "Options" }]);
  controller.abort();
  assert.equal(released, true);
  cleanup();
});

test("an older initial settings read does not overwrite a newer notification", async () => {
  let finishRead: ((state: unknown) => void) | undefined;
  let listener: ((state: unknown) => void) | undefined;
  const pending = new Promise<unknown>((resolve) => { finishRead = resolve; });
  const handlers = new Map<string, (input: unknown, context: unknown) => unknown>();
  const server = {
    registerSettings: () => ({ read: () => pending, subscribe: (callback: (state: unknown) => void) => { listener = callback; return () => {}; } }),
    handle: (contract: { name: string }, handler: (input: unknown, context: unknown) => unknown) => { handlers.set(contract.name, handler); },
  };
  // The fake implements the server registration methods used by the contribution.
  const cleanup = contribute(server as unknown as PluginServerContext);
  const handler = handlers.get("preferences.visibility");
  assert.ok(handler);
  const controller = new AbortController();
  const events: unknown[] = [];
  handler({}, { signal: controller.signal, push: async (event: unknown) => { events.push(event); } });
  assert.ok(listener && finishRead);
  listener({ status: "ready", values: settingsSchema.parse({ showAdvanced: true }) });
  finishRead({ status: "ready", values: settingsSchema.parse({ showAdvanced: false }) });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(events, [{ showAdvanced: true, quickLabel: "Prompt Import", advancedLabel: "Prompt Advance" }]);
  controller.abort();
  cleanup();
});
