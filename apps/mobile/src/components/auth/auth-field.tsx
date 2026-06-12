import { Text, TextInput, View, type KeyboardTypeOptions, type TextInputProps } from 'react-native';

interface AuthFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
}

// Auth screens always sit on the dark login video, so colors are pinned
// light-on-dark instead of following the app theme.
const onVideo = {
  label: '#FFFFFF',
  text: '#FFFFFF',
  placeholder: 'rgba(235, 235, 245, 0.55)',
  fieldBackground: 'rgba(255, 255, 255, 0.08)',
  border: 'rgba(255, 255, 255, 0.16)',
  danger: '#FF9D96',
};

export function AuthField({ label, error, ...props }: AuthFieldProps) {
  return (
    <View className="gap-2.5">
      <Text className="text-sm font-semibold" style={{ color: onVideo.label }}>
        {label}
      </Text>
      <TextInput
        placeholderTextColor={onVideo.placeholder}
        keyboardAppearance="dark"
        className="rounded-xl border px-4 py-4 text-base"
        style={{
          borderColor: error ? onVideo.danger : onVideo.border,
          backgroundColor: onVideo.fieldBackground,
          color: onVideo.text,
        }}
        {...props}
      />
      {error ? (
        <Text className="text-xs leading-5" style={{ color: onVideo.danger }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
