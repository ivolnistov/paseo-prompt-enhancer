import assert from "node:assert/strict";
import { test } from "node:test";
import { selectHistory, type HistoryEntry } from "../server/history";

const entries: readonly HistoryEntry[] = [
  { kind: "user", text: "ab" },
  { kind: "tool", text: "xy" },
  { kind: "assistant", text: "c😀e" },
];

test("selects the latest eligible Unicode characters in order", () => {
  assert.equal(selectHistory(entries, 0, false), "");
  assert.equal(selectHistory(entries, 3, false), "c😀e");
  assert.equal(selectHistory(entries, 4, false), "bc😀e");
  assert.equal(selectHistory(entries, 5, true), "xyc😀e");
});

test("rejects invalid limits", () => {
  assert.throws(() => selectHistory(entries, -1, true));
  assert.throws(() => selectHistory(entries, 1.2, true));
});
