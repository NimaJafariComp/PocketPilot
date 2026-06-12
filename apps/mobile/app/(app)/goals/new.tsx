import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useData } from '@pocketpilot/services/src/react';
import { GoalEditorFields, type GoalDraft } from '@/components/goals/goal-editor-fields';
import { FormScreen } from '@/components/forms/form-screen';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies } from '@/theme/tokens';
import { mobileServices } from '@/config/services';

function buildInitialDraft(): GoalDraft {
  return {
    name: '',
    targetAmount: '',
    deadline: '',
  };
}

export default function NewGoalScreen() {
  const router = useRouter();
  const { addGoal } = useData();
  const { colors } = useAppTheme();
  const [draft, setDraftState] = useState<GoalDraft>(buildInitialDraft);
  const [isSaving, setIsSaving] = useState(false);

  const setDraft = (updater: (current: GoalDraft) => GoalDraft) => {
    setDraftState((current) => updater(current));
  };

  async function handleSave() {
    if (isSaving) {
      return;
    }

    const targetAmount = Number.parseFloat(draft.targetAmount);
    if (!draft.name.trim()) {
      await mobileServices.dialog.alert('Enter a goal name.', 'Missing name');
      return;
    }
    if (Number.isNaN(targetAmount) || targetAmount <= 0) {
      await mobileServices.dialog.alert('Enter a valid target amount greater than 0.', 'Invalid amount');
      return;
    }

    try {
      setIsSaving(true);
      const nextGoal = {
        name: draft.name.trim(),
        targetAmount,
        currentAmount: 0,
        contributions: [],
        ...(draft.deadline ? { deadline: new Date(draft.deadline).toISOString() } : {}),
      };
      await addGoal(nextGoal);
      router.replace('/goals');
    } catch (error) {
      await mobileServices.dialog.alert(
        error instanceof Error ? error.message : 'Failed to create the goal.',
        'Save failed',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormScreen
      footer={
        <View className="flex-row gap-3">
          <Pressable
            className="flex-1 rounded-xl px-4 py-4"
            style={{ backgroundColor: colors.secondary }}
            onPress={() => router.back()}
          >
            <Text
              className="text-center text-sm"
              style={{ color: colors.secondaryForeground, fontFamily: fontFamilies.sans.semibold }}
            >
              Cancel
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 rounded-xl px-4 py-4"
            style={{ backgroundColor: colors.primary, opacity: isSaving ? 0.65 : 1 }}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text
              className="text-center text-sm"
              style={{ color: colors.primaryForeground, fontFamily: fontFamilies.sans.semibold }}
            >
              {isSaving ? 'Saving...' : 'Create Goal'}
            </Text>
          </Pressable>
        </View>
      }
    >
      <GoalEditorFields draft={draft} setDraft={setDraft} />
    </FormScreen>
  );
}
