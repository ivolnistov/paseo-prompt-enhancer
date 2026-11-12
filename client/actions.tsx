import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSettings, useSubscription, type PluginButtonContentProps, type PluginButtonRegistration, type PluginClientContext } from "@getpaseo/plugin/client";
import { TextInput } from "@getpaseo/plugin/client/ui";
import { settingsRpc } from "@getpaseo/plugin";
import { enhancementStatus, startEnhancement } from "../shared/enhance";
import { builtInScenarios, preferences, settingsSchema, visibilityChanges, type Presentation } from "../shared/settings";
import { applyImprovement } from "./draft";
import { createVisibilityState } from "./visibility";

interface AgentActions { quick: PluginButtonRegistration; advanced: PluginButtonRegistration; undo: PluginButtonRegistration }

export function registerActions(client: PluginClientContext): { cleanup(): void; setPresentation(value: Presentation): void } {
  const registrations = new Map<string, AgentActions>();
  const busy = new Set<string>();
  const previous = new Map<string, string>();
  const lifetime = new AbortController();
  let presentation: Presentation = { showAdvanced: false, quickLabel: "Prompt Import", advancedLabel: "Prompt Advance" };

  const visibility = createVisibilityState<Presentation>((value) => {
    presentation = value;
    for (const registration of registrations.values()) {
      registration.quick.update({ title: value.quickLabel, label: value.quickLabel });
      registration.advanced.update({ title: value.advancedLabel, label: value.advancedLabel, visible: value.showAdvanced });
    }
  });
  const setPresentation = visibility.update;

  function SettingsBridge() {
    useSubscription(visibilityChanges, {}, setPresentation);
    return null;
  }
  const removeSettingsBridge = client.addComposerItem({ id: "settings-bridge", Component: SettingsBridge });
  void visibility.loadInitial(async () => {
    const result = await client.rpc(settingsRpc(preferences.id).read, {});
    if (result.status !== "ready") throw new Error(result.error);
    return settingsSchema.parse(result.values);
  }).catch((error: unknown) => { if (!lifetime.signal.aborted) console.error("Prompt Enhancer settings unavailable", error); });

  async function run(workspaceId: string, agentId: string, instruction: string, historyLimit: number, includeTools: boolean): Promise<void> {
    if (busy.has(agentId)) throw new Error("An enhancement is already running.");
    const initial = client.composers({ agentId })[0];
    if (!initial?.prompt.trim()) throw new Error("Write a prompt first.");
    busy.add(agentId);
    registrations.get(agentId)?.quick.update({ disabled: true });
    try {
      const { operationId } = await client.rpc(startEnhancement, { workspaceId, agentId, draft: initial.prompt, instruction, historyLimit, includeTools });
      const deadline = Date.now() + 180_000;
      let text: string | null = null;
      while (Date.now() < deadline && !lifetime.signal.aborted) {
        const result = await client.rpc(enhancementStatus, { operationId });
        if (result.status === "error") throw new Error(result.message);
        if (result.status === "complete") { text = result.text; break; }
        await new Promise<void>((resolve) => setTimeout(resolve, 1_000));
      }
      if (text === null) throw new Error("The enhancement did not complete in time.");
      const current = client.composers({ agentId })[0];
      if (!current || lifetime.signal.aborted) throw new Error("This composer is no longer available.");
      previous.set(agentId, applyImprovement(current, text));
      registrations.get(agentId)?.undo.update({ visible: true });
    } finally {
      busy.delete(agentId);
      registrations.get(agentId)?.quick.update({ disabled: false });
    }
  }

  async function quick(workspaceId: string, agentId: string): Promise<void> {
    const stored = await client.rpc(settingsRpc(preferences.id).read, {});
    if (stored.status !== "ready") throw new Error(stored.error);
    const settings = settingsSchema.parse(stored.values);
    const scenario = [...builtInScenarios, ...settings.customScenarios].find((item) => item.id === settings.defaultScenario);
    if (!scenario) throw new Error("Choose a default scenario in settings.");
    await run(workspaceId, agentId, scenario.instruction, settings.historyLimit, settings.includeTools);
  }

  function Advanced(props: PluginButtonContentProps) {
    const settings = useSettings(preferences);
    const [selected, setSelected] = useState("");
    const [instruction, setInstruction] = useState("");
    const [limit, setLimit] = useState("");
    const [running, setRunning] = useState(false);
    const [error, setError] = useState("");
    if (props.context !== "agent") return null;
    if (settings.status !== "ready") return <Text style={{ color: props.theme.colors.foreground }}>Settings are unavailable.</Text>;
    const { agentId, workspaceId } = props;
    const scenarios = [...builtInScenarios, ...settings.values.customScenarios];
    const current = selected || settings.values.defaultScenario;
    const active = scenarios.find((scenario) => scenario.id === current);
    const text = selected ? instruction : active?.instruction ?? "";
    const runAdvanced = async () => {
      const count = limit === "" ? settings.values.historyLimit : Number(limit);
      if (!Number.isSafeInteger(count) || count < 0 || !text.trim()) { setError("Enter an instruction and a nonnegative character limit."); return; }
      setRunning(true); setError("");
      try { await run(workspaceId, agentId, text, count, settings.values.includeTools); props.close(); }
      catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
      finally { setRunning(false); }
    };
    return <View style={{ padding: 16, gap: 10 }}>
      <Text style={{ color: props.theme.colors.foreground }}>Scenario</Text>
      {scenarios.map((scenario) => <Pressable key={scenario.id} accessibilityRole="button" onPress={() => { setSelected(scenario.id); setInstruction(scenario.instruction); }}><Text style={{ color: props.theme.colors.foreground }}>{scenario.id === current ? "● " : "○ "}{scenario.name}</Text></Pressable>)}
      <TextInput accessibilityLabel="Instruction" multiline value={text} onChangeText={(value) => { setSelected(current); setInstruction(value); }} style={{ color: props.theme.colors.foreground, borderColor: props.theme.colors.border, borderWidth: 1, padding: 8, minHeight: 80 }} />
      <TextInput accessibilityLabel="History character limit" keyboardType="numeric" value={limit} placeholder={String(settings.values.historyLimit)} placeholderTextColor={props.theme.colors.foregroundMuted} onChangeText={setLimit} style={{ color: props.theme.colors.foreground, borderColor: props.theme.colors.border, borderWidth: 1, padding: 8 }} />
      {error ? <Text style={{ color: props.theme.colors.statusDanger }}>{error}</Text> : null}
      <Pressable disabled={running} accessibilityRole="button" onPress={() => { void runAdvanced(); }}><Text style={{ color: props.theme.colors.accent }}>{running ? "Improving…" : "Improve"}</Text></Pressable>
    </View>;
  }

  function remove(agentId: string): void {
    const registration = registrations.get(agentId);
    registration?.quick.remove(); registration?.advanced.remove(); registration?.undo.remove();
    registrations.delete(agentId); previous.delete(agentId);
  }
  function register(agent: { id: string; workspaceId?: string | null }): void {
    if (!agent.workspaceId || lifetime.signal.aborted || registrations.has(agent.id)) return;
    const { id: agentId, workspaceId } = agent;
    const quickButton = client.addComposerPill({ id: "quick", agentId, workspaceId, button: { title: presentation.quickLabel, label: presentation.quickLabel, icon: "Sparkles", behavior: { kind: "action", onPress: () => quick(workspaceId, agentId) } } });
    const advanced = client.addComposerPill({ id: "advanced", agentId, workspaceId, button: { title: presentation.advancedLabel, label: presentation.advancedLabel, icon: "SlidersHorizontal", visible: presentation.showAdvanced, behavior: { kind: "popover", Content: Advanced } } });
    const undo = client.addComposerPill({ id: "undo", agentId, workspaceId, button: { title: "Undo prompt improvement", label: "Undo", icon: "Undo2", visible: false, behavior: { kind: "action", onPress() { const current = client.composers({ agentId })[0]; const text = previous.get(agentId); if (current && text !== undefined) { current.setPrompt(text); previous.delete(agentId); registrations.get(agentId)?.undo.update({ visible: false }); } } } } });
    registrations.set(agentId, { quick: quickButton, advanced, undo });
  }
  void client.paseo.agents.list({ subscribe: {}, signal: lifetime.signal }).then(({ subscription }) => {
    subscription.subscribe({
      snapshot: ({ entries }) => { for (const id of registrations.keys()) remove(id); for (const { agent } of entries) register(agent); },
      update: (message) => { if (message.type !== "agent_update") return; const update = message.payload; if (update.kind === "upsert") register(update.agent); else remove(update.agentId); },
    });
  }).catch((error: unknown) => { if (!lifetime.signal.aborted) console.error("Prompt Enhancer agent observation failed", error); });
  return {
    setPresentation,
    cleanup() { lifetime.abort(); visibility.close(); removeSettingsBridge(); for (const id of registrations.keys()) remove(id); },
  };
}
