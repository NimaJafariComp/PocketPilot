import type { PropsWithChildren } from "react";
import { Text, View } from "react-native";
import { useAppTheme } from "@/providers/theme-provider";
import { fontFamilies } from "@/theme/tokens";

interface FormFieldProps extends PropsWithChildren {
  label: string;
  hint?: string;
}

export function FormField({ label, hint, children }: FormFieldProps) {
  const { colors } = useAppTheme();

  return (
    <View className="gap-2">
      <View className="gap-1">
        <Text
          className="text-xs uppercase tracking-[1.6px]"
          style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.medium }}
        >
          {label}
        </Text>
        {hint ? (
          <Text
            className="text-xs leading-5"
            style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
          >
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}
