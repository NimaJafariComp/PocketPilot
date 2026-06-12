import { Text, View } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';
import { fontFamilies, type SectionTone } from '@/theme/tokens';
import { FittedValueText } from '@/components/data/fitted-value-text';

export interface SummaryStripItem {
  label: string;
  value: string;
  detail?: string;
  valueColor?: string;
}

interface SummaryStripProps {
  items: SummaryStripItem[];
  /** @deprecated unused in the native redesign */
  eyebrow?: string;
  /** @deprecated unused in the native redesign */
  tone?: SectionTone;
}

// Plain grouped card split into equal columns by hairline dividers.
export function SummaryStrip({ items }: SummaryStripProps) {
  const { colors } = useAppTheme();

  return (
    <View className="flex-row rounded-xl" style={{ backgroundColor: colors.card }}>
      {items.map((item, index) => (
        <View
          key={`${item.label}-${index}`}
          className="flex-1 px-4 py-3"
          style={{
            borderLeftWidth: index === 0 ? 0 : 1,
            borderColor: colors.border,
          }}
        >
          <Text
            className="text-[13px]"
            style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
          >
            {item.label}
          </Text>
          <FittedValueText
            className="mt-1 text-[22px] tracking-tight"
            style={{
              color: item.valueColor || colors.foreground,
              fontFamily: fontFamilies.sans.semibold,
            }}
          >
            {item.value}
          </FittedValueText>
          {item.detail ? (
            <Text
              className="mt-1 text-[12px] leading-4"
              style={{ color: colors.mutedForeground, fontFamily: fontFamilies.sans.regular }}
            >
              {item.detail}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}
