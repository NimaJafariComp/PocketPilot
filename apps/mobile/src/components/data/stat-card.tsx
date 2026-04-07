import { Text, View } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies } from '@/theme/tokens';
import { FittedValueText } from '@/components/data/fitted-value-text';

interface StatCardProps {
  label: string;
  value: string;
  detail?: string;
}

export function StatCard({ label, value, detail }: StatCardProps) {
  const { colors } = useAppTheme();

  return (
    <View
      className="flex-1 rounded-[24px] border px-4 py-4"
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
      }}
    >
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
