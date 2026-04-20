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
  eyebrow?: string;
  tone?: SectionTone;
}

export function SummaryStrip({ items, eyebrow, tone = 'neutral' }: SummaryStripProps) {
  const { colors } = useAppTheme();
  const accent = colors.sectionAccents[tone];

  return (
    <View
      className="overflow-hidden rounded-[28px] border"
      style={{
        backgroundColor: colors.panel,
        borderColor: colors.border,
        shadowColor: accent.shadow,
        shadowOpacity: 1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 10 },
        elevation: 2,
      }}
    >
      <View className="h-1.5" style={{ backgroundColor: accent.line }} />
      {eyebrow ? (
        <View className="px-5 pt-4">
          <View
            className="self-start rounded-full px-3 py-1.5"
            style={{ backgroundColor: accent.chipBackground }}
          >
            <Text
              className="text-[11px] uppercase tracking-[1.8px]"
              style={{ color: accent.chipColor, fontFamily: fontFamilies.sans.semibold }}
            >
              {eyebrow}
            </Text>
          </View>
        </View>
      ) : null}
      <View className="flex-row flex-wrap">
        {items.map((item, index) => (
          <View
            key={`${item.label}-${index}`}
            className="min-w-[33%] flex-1 px-5 py-5"
            style={{
              borderLeftWidth: index === 0 ? 0 : 1,
              borderTopWidth: eyebrow ? 0 : 0,
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
