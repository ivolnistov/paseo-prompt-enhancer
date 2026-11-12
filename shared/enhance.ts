import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const startEnhancement = defineRpc({
  name: "enhance.start",
  input: z.object({
    workspaceId: z.string().min(1),
    agentId: z.string().min(1),
    draft: z.string().refine((value) => value.trim().length > 0),
    instruction: z.string().refine((value) => value.trim().length > 0),
    historyLimit: z.number().int().nonnegative().safe(),
    includeTools: z.boolean(),
  }),
  output: z.object({ operationId: z.string().min(1) }),
});

export const enhancementStatus = defineRpc({
  name: "enhance.status",
  input: z.object({ operationId: z.string().min(1) }),
  output: z.discriminatedUnion("status", [
    z.object({ status: z.literal("running") }),
    z.object({ status: z.literal("complete"), text: z.string().refine((value) => value.trim().length > 0) }),
    z.object({ status: z.literal("error"), message: z.string() }),
  ]),
});
