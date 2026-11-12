export interface HistoryEntry {
  readonly kind: "user" | "assistant" | "tool";
  readonly text: string;
}

export function selectHistory(entries: readonly HistoryEntry[], limit: number, includeTools: boolean): string {
  if (!Number.isSafeInteger(limit) || limit < 0) throw new Error("History limit must be a nonnegative integer.");
  if (limit === 0) return "";
  const eligible = entries.filter((entry) => includeTools || entry.kind !== "tool");
  const text = eligible.map((entry) => entry.text).join("");
  return Array.from(text).slice(-limit).join("");
}
