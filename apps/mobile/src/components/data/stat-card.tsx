import { Text, View } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies, type SectionTone } from '@/theme/tokens';
import { FittedValueText } from '@/components/data/fitted-value-text';

interface StatCardProps {
  label: string;
  value: string;
  detail?: string;
  tone?: SectionTone;
}

export function StatCard({ label, value, detail, tone = 'neutral' }: StatCardProps) {
  const { colors } = useAppTheme();
  const accent = colors.sectionAccents[tone];

  return (
    <View
      className="flex-1 overflow-hidden rounded-[24px] border px-4 py-4"
      style={{
        backgroundColor: colors.panel,
        borderColor: colors.border,
      }}
    >
      <View className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: accent.line }} />
      <Text
        className="text-[11px] uppercase tracking-[2px]"
        style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.medium }}
      >
        {label}
      </Text>
      <FittedValueText
        className="mt-3 text-2xl tracking-tight"
        style={{ color: colors.foreground, fontFamily: fontFamilies.sans.semibold }}
      >
        {value}
      </FittedValueText>
      {detail ? (
        <Text
          className="mt-2 text-xs leading-5"
          style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
        >
          {detail}
        </Text>
      ) : null}
    </View>
  );
}
