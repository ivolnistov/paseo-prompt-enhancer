import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { usePaseo, useSettings, type PluginSurfaceProps } from "@getpaseo/plugin/client";
import { SettingsAction, SettingsCard, SettingsInput, SettingsSection, SettingsSelect, SettingsSwitch, TextInput as HostTextInput } from "@getpaseo/plugin/client/ui";
import { preferences, settingsSchema, type Preferences, type Presentation } from "../shared/settings";

export function Settings({ theme, onSaved }: PluginSurfaceProps & { onSaved(value: Presentation): void }) {
  const settings = useSettings(preferences);
  const paseo = usePaseo();
  const [draft, setDraft] = useState<Preferences | null>(null);
  const [revision, setRevision] = useState("");
  const [catalog, setCatalog] = useState<Array<{ provider: string; label: string; models: Array<{ id: string; label: string }> }>>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void paseo.providers.waitForReady().then((snapshot) => {
      if (active) setCatalog(snapshot.entries.filter((entry) => entry.enabled).map((entry) => ({ provider: entry.provider, label: entry.label ?? entry.provider, models: (entry.models ?? []).filter((model) => model.isSelectable !== false).map((model) => ({ id: model.id, label: model.label })) })));
    }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : String(reason)); });
    return () => { active = false; };
  }, [paseo]);
  useEffect(() => {
    if (settings.status === "ready" && draft === null) { setDraft(settings.values); setRevision(settings.revision); }
  }, [settings, draft]);
  if (settings.status !== "ready" || !draft) return <Text style={{ color: theme.colors.foreground }}>{settings.status === "error" || settings.status === "invalid" ? settings.error : "Loading settings…"}</Text>;
  const update = (patch: Partial<Preferences>) => setDraft({ ...draft, ...patch });
  const scenarios = draft.scenarios;
  const models = catalog.find((entry) => entry.provider === draft.provider)?.models ?? [];
  const save = async () => {
    if (await settings.save(draft, revision)) { onSaved(settingsSchema.parse(draft)); setDraft(null); setError(""); }
    else setError("Could not save settings. Reload and review your changes if another client changed them.");
  };
  return <View style={{ gap: 16 }}>
    <SettingsSection title="Model"><SettingsCard>
      <SettingsSelect label="Provider" hint="Claude is recommended for fast rewriting. Other providers may take longer and use more tokens." value={draft.provider} options={catalog.map((entry) => ({ label: entry.label, value: entry.provider }))} onValueChange={(provider) => update({ provider, model: "" })} />
      {draft.provider === "claude" ? <SettingsSwitch label="Fast Claude CLI mode" hint="Uses the host’s Claude CLI and authentication. Custom Paseo provider commands and environment settings do not apply." value={draft.claudeFastMode} onValueChange={(claudeFastMode) => update({ claudeFastMode })} /> : null}
      <SettingsSelect label="Model" value={draft.model} options={models.map((model) => ({ label: model.label, value: model.id }))} onValueChange={(model) => update({ model })} />
      <SettingsSelect label="Default scenario" disabled={scenarios.length === 0} value={draft.defaultScenario} options={scenarios.map((scenario) => ({ label: scenario.name, value: scenario.id }))} onValueChange={(defaultScenario) => update({ defaultScenario })} />
      <SettingsInput label="History limit in characters" initialValue={String(draft.historyLimit)} onChangeText={(value) => update({ historyLimit: value.trim() === "" ? 0 : Number(value) })} />
      <SettingsSwitch label="Include tool calls and results" value={draft.includeTools} onValueChange={(includeTools) => update({ includeTools })} />
    </SettingsCard></SettingsSection>
    <SettingsSection title="Composer buttons"><SettingsCard>
      <SettingsInput label="Quick button name" initialValue={draft.quickLabel} onChangeText={(quickLabel) => update({ quickLabel })} />
      <SettingsSwitch label="Show quick button" value={draft.showQuick} onValueChange={(showQuick) => update({ showQuick })} />
      <SettingsInput label="Advanced button name" initialValue={draft.advancedLabel} onChangeText={(advancedLabel) => update({ advancedLabel })} />
      <SettingsSwitch label="Show advanced button" value={draft.showAdvanced} onValueChange={(showAdvanced) => update({ showAdvanced })} />
      <SettingsInput label="Goal button name" initialValue={draft.goalLabel} onChangeText={(goalLabel) => update({ goalLabel })} />
      <SettingsSwitch label="Show goal button" value={draft.showGoal} onValueChange={(showGoal) => update({ showGoal })} />
    </SettingsCard></SettingsSection>
    <SettingsSection title="Goal Improve"><SettingsCard>
      <View style={{ paddingHorizontal: 16, paddingVertical: 16, gap: 8 }}>
        <Text style={{ color: theme.colors.foreground }}>Goal instruction</Text>
        <Text style={{ color: theme.colors.foregroundMuted, fontSize: 13 }}>Used to prepare the /goal command. Edit it to change how goals are written.</Text>
        <HostTextInput accessibilityLabel="Goal instruction" value={draft.goalInstruction} multiline onChangeText={(goalInstruction) => update({ goalInstruction })} style={{ color: theme.colors.foreground, backgroundColor: theme.colors.surface0, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, minHeight: 150, textAlignVertical: "top" }} />
      </View>
      <SettingsInput label="Goal history limit in characters" initialValue={String(draft.goalHistoryLimit)} onChangeText={(value) => update({ goalHistoryLimit: value.trim() === "" ? 0 : Number(value) })} />
      <SettingsSwitch label="Include tool calls and results in goal" value={draft.goalIncludeTools} onValueChange={(goalIncludeTools) => update({ goalIncludeTools })} />
    </SettingsCard></SettingsSection>
    <SettingsSection title="Scenarios"><SettingsCard>
      {draft.scenarios.map((scenario, index) => <View key={scenario.id} style={{ paddingHorizontal: 16, paddingVertical: 16, gap: 12, borderBottomColor: theme.colors.border, borderBottomWidth: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Text style={{ color: theme.colors.foreground, fontSize: 14, fontWeight: "600", flexShrink: 1 }}>Scenario {index + 1}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove scenario ${scenario.name}`} onPress={() => update({ scenarios: draft.scenarios.filter((_, i) => i !== index), defaultScenario: draft.defaultScenario === scenario.id ? (draft.scenarios.find((item) => item.id !== scenario.id)?.id ?? "") : draft.defaultScenario })} style={{ paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8 }}>
            <Text style={{ color: theme.colors.foregroundMuted }}>Remove</Text>
          </Pressable>
        </View>
        <View style={{ gap: 6 }}>
          <Text style={{ color: theme.colors.foregroundMuted, fontSize: 13 }}>Name</Text>
          <TextInput accessibilityLabel="Scenario name" value={scenario.name} onChangeText={(name) => update({ scenarios: draft.scenarios.map((item, i) => i === index ? { ...item, name } : item) })} style={{ color: theme.colors.foreground, backgroundColor: theme.colors.surface0, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }} />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={{ color: theme.colors.foregroundMuted, fontSize: 13 }}>Instruction</Text>
          <TextInput accessibilityLabel="Scenario instruction" value={scenario.instruction} multiline onChangeText={(instruction) => update({ scenarios: draft.scenarios.map((item, i) => i === index ? { ...item, instruction } : item) })} style={{ color: theme.colors.foreground, backgroundColor: theme.colors.surface0, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, minHeight: 80, textAlignVertical: "top" }} />
        </View>
      </View>)}
      <SettingsAction label="Add a scenario" actionLabel="Add" onPress={() => { let id = `custom-${Date.now()}`; while (draft.scenarios.some((scenario) => scenario.id === id)) id += "-1"; update({ scenarios: [...draft.scenarios, { id, name: "New scenario", instruction: "Rewrite the prompt." }], defaultScenario: draft.defaultScenario || id }); }} />
    </SettingsCard></SettingsSection>
    <Text style={{ color: theme.colors.foregroundMuted, paddingHorizontal: 4, lineHeight: 20 }}>The selected provider receives the draft and selected history. With Claude fast mode enabled, the host’s Claude CLI runs without tools or saved sessions. Otherwise a background agent uses the selected provider’s normal permissions and history retention.</Text>
    {error || settings.saveError ? <Text style={{ color: theme.colors.statusDanger }}>{error || settings.saveError}</Text> : null}
    <SettingsAction label="Save settings" actionLabel="Save" disabled={settings.saving} onPress={() => { void save(); }} />
  </View>;
}
