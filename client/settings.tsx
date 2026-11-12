import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { usePaseo, useSettings, type PluginSurfaceProps } from "@getpaseo/plugin/client";
import { SettingsAction, SettingsCard, SettingsInput, SettingsSection, SettingsSelect, SettingsSwitch } from "@getpaseo/plugin/client/ui";
import { builtInScenarios, preferences, type Preferences } from "../shared/settings";

export function Settings({ theme }: PluginSurfaceProps) {
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
  const scenarios = [...builtInScenarios, ...draft.customScenarios];
  const models = catalog.find((entry) => entry.provider === draft.provider)?.models ?? [];
  const save = async () => {
    if (await settings.save(draft, revision)) { setDraft(null); setError(""); }
    else setError("Could not save settings. Reload and review your changes if another client changed them.");
  };
  return <View style={{ gap: 16 }}>
    <SettingsSection title="Model"><SettingsCard>
      <SettingsSelect label="Provider" value={draft.provider} options={catalog.map((entry) => ({ label: entry.label, value: entry.provider }))} onValueChange={(provider) => update({ provider, model: "" })} />
      <SettingsSelect label="Model" value={draft.model} options={models.map((model) => ({ label: model.label, value: model.id }))} onValueChange={(model) => update({ model })} />
      <SettingsSelect label="Default scenario" value={draft.defaultScenario} options={scenarios.map((scenario) => ({ label: scenario.name, value: scenario.id }))} onValueChange={(defaultScenario) => update({ defaultScenario })} />
      <SettingsInput label="History limit in characters" initialValue={String(draft.historyLimit)} onChangeText={(value) => update({ historyLimit: value.trim() === "" ? 0 : Number(value) })} />
      <SettingsSwitch label="Include tool calls and results" value={draft.includeTools} onValueChange={(includeTools) => update({ includeTools })} />
      <SettingsSwitch label="Show advanced action" value={draft.showAdvanced} onValueChange={(showAdvanced) => update({ showAdvanced })} />
    </SettingsCard></SettingsSection>
    <SettingsSection title="Custom scenarios"><SettingsCard>
      {draft.customScenarios.map((scenario, index) => <View key={scenario.id} style={{ gap: 8, padding: 12 }}>
        <TextInput accessibilityLabel="Scenario name" value={scenario.name} onChangeText={(name) => update({ customScenarios: draft.customScenarios.map((item, i) => i === index ? { ...item, name } : item) })} style={{ color: theme.colors.foreground, borderColor: theme.colors.border, borderWidth: 1, padding: 8 }} />
        <TextInput accessibilityLabel="Scenario instruction" value={scenario.instruction} multiline onChangeText={(instruction) => update({ customScenarios: draft.customScenarios.map((item, i) => i === index ? { ...item, instruction } : item) })} style={{ color: theme.colors.foreground, borderColor: theme.colors.border, borderWidth: 1, padding: 8 }} />
        <SettingsAction label="Remove scenario" actionLabel="Remove" onPress={() => update({ customScenarios: draft.customScenarios.filter((_, i) => i !== index), defaultScenario: draft.defaultScenario === scenario.id ? "readability" : draft.defaultScenario })} />
      </View>)}
      <SettingsAction label="Add a custom scenario" actionLabel="Add" onPress={() => update({ customScenarios: [...draft.customScenarios, { id: `custom-${Date.now()}`, name: "New scenario", instruction: "Rewrite the prompt." }] })} />
    </SettingsCard></SettingsSection>
    <Text style={{ color: theme.colors.foregroundMuted }}>The selected provider receives the draft and selected history. Its normal agent permissions and history retention apply.</Text>
    {error || settings.saveError ? <Text style={{ color: theme.colors.statusDanger }}>{error || settings.saveError}</Text> : null}
    <SettingsAction label="Save settings" actionLabel="Save" disabled={settings.saving} onPress={() => { void save(); }} />
  </View>;
}
