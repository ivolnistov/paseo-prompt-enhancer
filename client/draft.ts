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
