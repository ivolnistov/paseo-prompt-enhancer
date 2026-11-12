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
  assert.equal(settings.goalLabel, "Goal Improve");
  assert.equal(settings.goalHistoryLimit, 0);
  assert.equal(settings.goalIncludeTools, false);
  assert.equal(settings.showQuick && settings.showAdvanced && settings.showGoal, true);
});

test("validates limits, scenario identity and custom instructions", () => {
  assert.equal(settingsSchema.safeParse({ historyLimit: -1 }).success, false);
  assert.equal(settingsSchema.safeParse({ historyLimit: 1.5 }).success, false);
  assert.equal(settingsSchema.safeParse({ quickLabel: "  " }).success, false);
  assert.equal(settingsSchema.safeParse({ advancedLabel: "" }).success, false);
  assert.equal(settingsSchema.safeParse({ goalLabel: "" }).success, false);
  assert.equal(settingsSchema.safeParse({ goalHistoryLimit: -1 }).success, false);
  const hidden = settingsSchema.parse({ showQuick: false, showAdvanced: true, showGoal: false });
  assert.deepEqual([hidden.showQuick, hidden.showAdvanced, hidden.showGoal], [false, true, false]);
  assert.equal(settingsSchema.parse({ quickLabel: "  Rewrite  " }).quickLabel, "Rewrite");
  assert.equal(settingsSchema.safeParse({ defaultScenario: "missing" }).success, false);
  const custom = { id: "custom-example", name: "Example", instruction: "Rewrite." };
  const parsed = settingsSchema.parse({ customScenarios: [custom], defaultScenario: custom.id });
  assert.deepEqual(parsed.customScenarios, [custom]);
  assert.equal(settingsSchema.safeParse({ customScenarios: [custom, custom] }).success, false);
});
