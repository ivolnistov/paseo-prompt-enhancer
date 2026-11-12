import assert from "node:assert/strict";
import { test } from "node:test";
import { applyImprovement, goalCommand } from "../client/draft";

test("restores the draft present at replacement time, including intervening edits", () => {
  const target = { prompt: "edited while waiting", setPrompt(text: string) { this.prompt = text; } };
  const previous = applyImprovement(target, "improved");
  assert.equal(target.prompt, "improved");
  target.setPrompt(previous);
  assert.equal(target.prompt, "edited while waiting");
});

test("prepares a goal command without accepting empty or control commands", () => {
  assert.equal(goalCommand("Ship the change and verify tests."), "/goal Ship the change and verify tests.");
  assert.equal(goalCommand(" /goal Ship it "), "/goal Ship it");
  for (const value of ["", "/goal", "/goal clear", "pause", "RESUME"]) assert.throws(() => goalCommand(value));
});

test("an empty result leaves the draft unchanged", () => {
  const target = { prompt: "keep", setPrompt(text: string) { this.prompt = text; } };
  assert.throws(() => applyImprovement(target, "  "));
  assert.equal(target.prompt, "keep");
});
