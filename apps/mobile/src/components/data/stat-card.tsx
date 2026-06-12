import { Text, View } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies, type SectionTone } from '@/theme/tokens';
import { FittedValueText } from '@/components/data/fitted-value-text';

interface StatCardProps {
  label: string;
  value: string;
  detail?: string;
  /** @deprecated unused in the native redesign */
  tone?: SectionTone;
}

export function StatCard({ label, value, detail }: StatCardProps) {
  const { colors } = useAppTheme();

  return (
    <View className="flex-1 rounded-xl px-4 py-3" style={{ backgroundColor: colors.card }}>
      <Text
        className="text-[13px]"
        style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
      >
        {label}
      </Text>
      <FittedValueText
        className="mt-1 text-[22px] tracking-tight"
        style={{ color: colors.foreground, fontFamily: fontFamilies.sans.semibold }}
      >
        {value}
      </FittedValueText>
      {detail ? (
        <Text
          className="mt-1 text-[12px] leading-4"
          style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
        >
          {detail}
        </Text>
      ) : null}
    </View>
  );
}
