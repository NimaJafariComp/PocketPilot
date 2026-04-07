import { Text, View } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies } from '@/theme/tokens';
import { FittedValueText } from '@/components/data/fitted-value-text';

export interface SummaryStripItem {
  label: string;
  value: string;
  detail?: string;
  valueColor?: string;
}

interface SummaryStripProps {
  items: SummaryStripItem[];
}

export function SummaryStrip({ items }: SummaryStripProps) {
  const { colors } = useAppTheme();

  return (
    <View
      className="overflow-hidden rounded-[28px] border"
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
    >
      <View className="flex-row flex-wrap">
        {items.map((item, index) => (
          <View
            key={`${item.label}-${index}`}
            className="min-w-[33%] flex-1 px-5 py-5"
            style={{
              borderLeftWidth: index === 0 ? 0 : 1,
              borderColor: colors.border,
            }}
          >
            <Text
              className="text-[11px] uppercase tracking-[1.8px]"
              style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.medium }}
            >
              {item.label}
            </Text>
            <FittedValueText
              className="mt-2 text-[28px] tracking-tight"
              style={{
                color: item.valueColor || colors.foreground,
                fontFamily: fontFamilies.sans.semibold,
              }}
            >
              {item.value}
            </FittedValueText>
            {item.detail ? (
              <Text
                className="mt-1 text-xs leading-5"
                style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
              >
                {item.detail}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}
