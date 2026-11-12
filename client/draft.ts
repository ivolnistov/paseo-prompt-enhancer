export interface DraftTarget {
  readonly prompt: string;
  setPrompt(text: string): void;
}

export function applyImprovement(target: DraftTarget, result: string): string {
  if (!result.trim()) throw new Error("The provider returned an empty response.");
  const previous = target.prompt;
  target.setPrompt(result);
  return previous;
}

export function goalCommand(result: string): string {
  const objective = result.trim().replace(/^\/goal(?:\s+|$)/i, "").trim();
  if (!objective || /^(pause|resume|clear)$/i.test(objective)) throw new Error("The provider did not return a goal objective.");
  return `/goal ${objective}`;
}
