import assert from "node:assert/strict";
import { test } from "node:test";
import { createVisibilityState } from "../client/visibility";

test("a late initial read cannot override a newer visibility change", async () => {
  let finish: ((value: boolean) => void) | undefined;
  const read = new Promise<boolean>((resolve) => { finish = resolve; });
  const values: boolean[] = [];
  const state = createVisibilityState((visible) => values.push(visible));
  const loading = state.loadInitial(() => read);
  state.update(false);
  assert.ok(finish);
  finish(true);
  await loading;
  assert.deepEqual(values, [false]);
});

test("a late initial read has no effect after cleanup", async () => {
  let finish: ((value: boolean) => void) | undefined;
  const read = new Promise<boolean>((resolve) => { finish = resolve; });
  const values: boolean[] = [];
  const state = createVisibilityState((visible) => values.push(visible));
  const loading = state.loadInitial(() => read);
  state.close();
  assert.ok(finish);
  finish(true);
  await loading;
  assert.deepEqual(values, []);
});
