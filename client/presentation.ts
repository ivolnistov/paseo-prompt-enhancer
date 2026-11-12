import type { PluginButtonRegistration } from "@getpaseo/plugin/client";
import type { Presentation } from "../shared/settings";

export function applyPresentation(registration: { quick: PluginButtonRegistration; advanced: PluginButtonRegistration; goal: PluginButtonRegistration }, value: Presentation): void {
  registration.quick.update({ title: value.quickLabel, label: value.quickLabel, visible: value.showQuick });
  registration.advanced.update({ title: value.advancedLabel, label: value.advancedLabel, visible: value.showAdvanced });
  registration.goal.update({ title: value.goalLabel, label: value.goalLabel, visible: value.showGoal });
}
