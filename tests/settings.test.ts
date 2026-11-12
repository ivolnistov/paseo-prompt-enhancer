import assert from "node:assert/strict";
import { test } from "node:test";
import { settingsSchema } from "../shared/settings";

test("settings default to no history and a built-in scenario", () => {
  const settings = settingsSchema.parse({});
  assert.equal(settings.historyLimit, 0);
  assert.equal(settings.defaultScenario, "readability");
  assert.equal(settings.includeTools, false);
  assert.equal(settings.quickLabel, "Prompt Import");
  assert.equal(settings.advancedLabel, "Prompt Advance");
});

test("validates limits, scenario identity and custom instructions", () => {
  assert.equal(settingsSchema.safeParse({ historyLimit: -1 }).success, false);
  assert.equal(settingsSchema.safeParse({ historyLimit: 1.5 }).success, false);
  assert.equal(settingsSchema.safeParse({ quickLabel: "  " }).success, false);
  assert.equal(settingsSchema.safeParse({ advancedLabel: "" }).success, false);
  assert.equal(settingsSchema.parse({ quickLabel: "  Rewrite  " }).quickLabel, "Rewrite");
  assert.equal(settingsSchema.safeParse({ defaultScenario: "missing" }).success, false);
  const custom = { id: "custom-example", name: "Example", instruction: "Rewrite." };
  const parsed = settingsSchema.parse({ customScenarios: [custom], defaultScenario: custom.id });
  assert.deepEqual(parsed.customScenarios, [custom]);
  assert.equal(settingsSchema.safeParse({ customScenarios: [custom, custom] }).success, false);
});
