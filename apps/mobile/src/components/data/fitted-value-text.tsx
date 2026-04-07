import { Text, type TextProps } from 'react-native';

export function FittedValueText(props: TextProps) {
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.72}
      {...props}
    />
  );
}
