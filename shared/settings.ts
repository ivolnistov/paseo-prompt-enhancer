import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const builtInScenarios = [
  { id: "concise", name: "Make concise", instruction: "Rewrite the prompt to be clear and concise, preserving its intent and essential details. Return only the rewritten prompt." },
  { id: "readability", name: "Improve readability", instruction: "Improve the readability and structure of the prompt while preserving its intent. Return only the rewritten prompt." },
  { id: "clarify", name: "Clarify", instruction: "Clarify the request without inventing requirements. Preserve its intent and return only the rewritten prompt." },
] as const;

const scenarioSchema = z.object({
  id: z.string().regex(/^custom-[a-zA-Z0-9_-]+$/),
  name: z.string().trim().min(1),
  instruction: z.string().trim().min(1),
});

export const settingsSchema = z.object({
  provider: z.string().default(""),
  model: z.string().default(""),
  defaultScenario: z.string().default("readability"),
  customScenarios: z.array(scenarioSchema).default([]),
  historyLimit: z.number().int().nonnegative().safe().default(0),
  includeTools: z.boolean().default(false),
  showAdvanced: z.boolean().default(true),
}).superRefine((value, context) => {
  const ids = [...builtInScenarios.map((scenario) => scenario.id as string), ...value.customScenarios.map((scenario) => scenario.id)];
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", path: ["customScenarios"], message: "Scenario IDs must be unique." });
  }
  if (!ids.includes(value.defaultScenario)) {
    context.addIssue({ code: "custom", path: ["defaultScenario"], message: "Select an existing scenario." });
  }
});

export const preferences = defineSettings({
  id: "preferences",
  scope: "host",
  version: 1,
  schema: settingsSchema,
});

export type Preferences = z.output<typeof settingsSchema>;
