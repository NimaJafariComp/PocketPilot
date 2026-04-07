import Svg, { Path } from 'react-native-svg';
import { View } from 'react-native';
import { useAppTheme } from '@/providers/theme-provider';

interface SparklinePoint {
  amount: number;
}

interface SparklineProps {
  points: SparklinePoint[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({ points, width = 240, height = 56, color }: SparklineProps) {
  const { colors } = useAppTheme();

  if (points.length < 2) {
    return <View style={{ width, height }} />;
  }

  const values = points.map((point) => point.amount);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point.amount - min) / range) * (height - 8) - 4;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path d={path} fill="none" stroke={color || colors.primary} strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}
