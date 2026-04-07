import { Text, TextInput, View, type KeyboardTypeOptions, type TextInputProps } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';

interface AuthFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
}

export function AuthField({ label, error, ...props }: AuthFieldProps) {
  const { colors } = useAppTheme();

  return (
    <View className="gap-2.5">
      <Text className="text-sm font-semibold" style={{ color: colors.foreground }}>
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        className="rounded-[20px] border px-4 py-4 text-base"
        style={{
          borderColor: error ? colors.danger : colors.border,
          backgroundColor: colors.muted,
          color: colors.foreground,
        }}
        {...props}
      />
      {error ? (
        <Text className="text-xs leading-5" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
