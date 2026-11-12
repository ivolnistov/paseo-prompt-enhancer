import assert from "node:assert/strict";
import { test } from "node:test";
import { applyPresentation } from "../client/presentation";

test("updates the correct label and visibility for each composer action", () => {
  const changes: Record<string, unknown> = {};
  const registration = (name: string) => ({ update(value: unknown) { changes[name] = value; }, remove() {} });
  applyPresentation({ quick: registration("quick"), advanced: registration("advanced"), goal: registration("goal") }, {
    quickLabel: "Rewrite", advancedLabel: "Options", goalLabel: "Goal", showQuick: false, showAdvanced: true, showGoal: false,
  });
  assert.deepEqual(changes, {
    quick: { title: "Rewrite", label: "Rewrite", visible: false },
    advanced: { title: "Options", label: "Options", visible: true },
    goal: { title: "Goal", label: "Goal", visible: false },
  });
});
