import type { PropsWithChildren } from "react";
import { Text, View } from "react-native";
import { useAppTheme } from "@/providers/theme-provider";
import { fontFamilies, type SectionTone } from "@/theme/tokens";

interface SectionCardProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  /** @deprecated unused in the native redesign */
  eyebrow?: string;
  /** @deprecated unused in the native redesign */
  tone?: SectionTone;
  /** @deprecated unused in the native redesign */
  badge?: string;
}

// iOS inset-grouped section: uppercase header above a plain rounded card,
// optional footnote-style subtitle below the header.
export function SectionCard({ title, subtitle, children }: SectionCardProps) {
  const { colors } = useAppTheme();

  return (
    <View>
      <Text
        className="mb-2 ml-4 text-[12px] uppercase"
        style={{
          color: colors.mutedForeground,
          fontFamily: fontFamilies.sans.medium,
          letterSpacing: 0.5,
        }}
      >
        {title}
      </Text>
      <View className="rounded-xl px-4 py-3" style={{ backgroundColor: colors.card }}>
        {children}
      </View>
      {subtitle ? (
        <Text
          className="mt-2 ml-4 text-[13px] leading-[18px]"
          style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
