import Svg, { Circle, Path } from 'react-native-svg';
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
  fillColor?: string;
}

export function Sparkline({
  points,
  width = 240,
  height = 56,
  color,
  fillColor,
}: SparklineProps) {
  const { colors } = useAppTheme();

  if (points.length < 2) {
    return <View style={{ width, height }} />;
  }

  const values = points.map((point) => point.amount);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coordinates = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point.amount - min) / range) * (height - 8) - 4;
      return { x, y };
    });

  const path = coordinates
    .map((point, index) => {
      return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
    })
    .join(' ');
  const areaPath = `${path} L ${width} ${height - 2} L 0 ${height - 2} Z`;
  const lastPoint = coordinates[coordinates.length - 1];

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path d={areaPath} fill={fillColor || colors.goalPalette.fill} />
      <Path d={path} fill="none" stroke={color || colors.goalPalette.stroke} strokeWidth="3" strokeLinecap="round" />
      {lastPoint ? (
        <>
          <Circle cx={lastPoint.x} cy={lastPoint.y} r="5" fill={fillColor || colors.goalPalette.fill} />
          <Circle cx={lastPoint.x} cy={lastPoint.y} r="3" fill={color || colors.goalPalette.stroke} />
        </>
      ) : null}
    </Svg>
  );
}
