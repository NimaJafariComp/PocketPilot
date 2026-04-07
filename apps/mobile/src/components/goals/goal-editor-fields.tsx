import { TextInput } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies } from '@/theme/tokens';
import { FormField } from '@/components/forms/form-field';

export interface GoalDraft {
  name: string;
  targetAmount: string;
  deadline: string;
}

interface GoalEditorFieldsProps {
  draft: GoalDraft;
  setDraft: (updater: (current: GoalDraft) => GoalDraft) => void;
}

export function GoalEditorFields({ draft, setDraft }: GoalEditorFieldsProps) {
  const { colors } = useAppTheme();
  const inputStyle = {
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.foreground,
    fontFamily: fontFamilies.sans.regular,
  } as const;

  return (
    <>
      <FormField label="Goal Name">
        <TextInput
          value={draft.name}
          onChangeText={(value) => setDraft((current) => ({ ...current, name: value }))}
          placeholder="Emergency fund"
          placeholderTextColor={colors.mutedForeground}
          className="rounded-[20px] border px-4 py-4 text-base"
          style={inputStyle}
        />
      </FormField>

      <FormField label="Target Amount">
        <TextInput
          value={draft.targetAmount}
          onChangeText={(value) => setDraft((current) => ({ ...current, targetAmount: value }))}
          placeholder="5000.00"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="decimal-pad"
          className="rounded-[20px] border px-4 py-4 text-base"
          style={inputStyle}
        />
      </FormField>

      <FormField label="Deadline" hint="Optional. Use YYYY-MM-DD.">
        <TextInput
          value={draft.deadline}
          onChangeText={(value) => setDraft((current) => ({ ...current, deadline: value }))}
          placeholder="2026-12-31"
          placeholderTextColor={colors.mutedForeground}
          className="rounded-[20px] border px-4 py-4 text-base"
          style={inputStyle}
        />
      </FormField>
    </>
  );
}
