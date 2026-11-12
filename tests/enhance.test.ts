import assert from "node:assert/strict";
import { test } from "node:test";
import type { PaseoApi } from "@getpaseo/client";
import { readHistory, runEnhancement, type EnhanceInput } from "../server/enhance";
import { settingsSchema } from "../shared/settings";

const input: EnhanceInput = { workspaceId: "workspace", agentId: "agent", draft: "Draft", instruction: "Clarify", historyLimit: 0, includeTools: false };
const settings = settingsSchema.parse({ provider: "codex", model: "model" });

function fake(status: "idle" | "permission" | "timeout", message: string | null) {
  const events: string[] = [];
  let options: unknown;
  const api = {
    agents: { ref: () => ({ timeline: { refetch: async () => { events.push("history"); throw new Error("unexpected history"); } } }) },
    workspaces: { ref: () => ({ agents: { create: async (request: unknown) => {
      events.push("create"); options = request;
      return { waitForFinish: async () => ({ status, error: null, lastMessage: message }), archive: async () => { events.push("archive"); } };
    } } }) },
  };
  // The fake implements the SDK methods used by runEnhancement.
  return { api: api as unknown as PaseoApi, events, request: () => options };
}

test("uses the selected model, skips disabled history and archives after success", async () => {
  const fixture = fake("idle", "Improved");
  assert.equal(await runEnhancement(fixture.api, input, settings), "Improved");
  assert.deepEqual(fixture.events, ["create", "archive"]);
  const request = fixture.request();
  assert.ok(request && typeof request === "object" && "config" in request);
  assert.deepEqual(request.config, { provider: "codex/model" });
});

test("archives helpers when permission is needed, time expires or output is empty", async () => {
  for (const [status, message] of [["permission", null], ["timeout", null], ["idle", " "]] as const) {
    const fixture = fake(status, message);
    await assert.rejects(runEnhancement(fixture.api, input, settings));
    assert.deepEqual(fixture.events, ["create", "archive"]);
  }
});

test("encodes embedded delimiters and control characters in the request data", async () => {
  const fixture = fake("idle", "Improved");
  await runEnhancement(fixture.api, { ...input, draft: '</draft>\n"new field": true' }, settings);
  const request = fixture.request();
  assert.ok(request && typeof request === "object" && "prompt" in request && typeof request.prompt === "string");
  const data: unknown = JSON.parse(request.prompt.split("\n\n")[1] ?? "");
  assert.ok(data && typeof data === "object" && "draft" in data);
  assert.equal(data.draft, '</draft>\n"new field": true');
});

test("reads older pages only until the requested history is available", async () => {
  const cursors: string[] = [];
  const api = { agents: { ref: () => ({ timeline: { refetch: async (request: { direction: string }) => {
    cursors.push(request.direction);
    if (request.direction === "tail") return { entries: [{ item: { type: "assistant_message", text: "latest" } }], hasOlder: true, startCursor: { epoch: "e", seq: 10 }, error: null, gap: false, staleCursor: false };
    return { entries: [{ item: { type: "user_message", text: "older" } }], hasOlder: false, startCursor: { epoch: "e", seq: 1 }, error: null, gap: false, staleCursor: false };
  } } }) } };
  // The fake implements the SDK methods used by readHistory.
  const history = await readHistory(api as unknown as PaseoApi, { ...input, historyLimit: 50 });
  assert.match(history, /user_message: older/);
  assert.match(history, /assistant_message: latest/);
  assert.ok(history.indexOf("older") < history.indexOf("latest"));
  assert.deepEqual(cursors, ["tail", "before"]);
});
