import assert from "node:assert/strict";
import { test } from "node:test";
import { preferences, scenarioTemplates, settingsSchema } from "../shared/settings";

test("settings default to no history and a built-in scenario", () => {
  const settings = settingsSchema.parse({});
  assert.equal(settings.historyLimit, 0);
  assert.equal(settings.defaultScenario, "readability");
  assert.deepEqual(settings.scenarios, scenarioTemplates);
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
  const parsed = settingsSchema.parse({ scenarios: [custom], defaultScenario: custom.id });
  assert.deepEqual(parsed.scenarios, [custom]);
  assert.equal(settingsSchema.safeParse({ scenarios: [custom, custom], defaultScenario: custom.id }).success, false);
  assert.deepEqual(settingsSchema.parse({ scenarios: [], defaultScenario: "" }).scenarios, []);
  assert.equal(settingsSchema.safeParse({ scenarios: [], defaultScenario: "readability" }).success, false);
});


test("migrates old settings and preserves custom scenarios and default selection", async () => {
  if (!preferences.migrate) throw new Error("Migration is missing");
  const custom = { id: "custom-example", name: "My scenario", instruction: "My instruction" };
  const original = { provider: "claude", defaultScenario: custom.id, customScenarios: [custom], historyLimit: 42 };
  const migrated = settingsSchema.parse(await preferences.migrate(original, 1));
  assert.deepEqual(migrated.scenarios, [...scenarioTemplates, custom]);
  assert.equal(migrated.defaultScenario, custom.id);
  assert.equal(migrated.provider, "claude");
  assert.equal(migrated.historyLimit, 42);
  const edited = { ...migrated, scenarios: [{ ...migrated.scenarios[0], name: "Changed" }] };
  assert.equal(settingsSchema.parse({ ...edited, defaultScenario: edited.scenarios[0].id }).scenarios[0].name, "Changed");
  assert.deepEqual(settingsSchema.parse({ ...migrated, scenarios: [], defaultScenario: "" }).scenarios, []);
});
