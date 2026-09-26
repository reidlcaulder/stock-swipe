import { type AndroidSymbol, type SFSymbol, SymbolView } from 'expo-symbols';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';

// SF Symbols on iOS, Material Symbols on Android and web (bundled font, works offline).
const ICONS = {
  discover: { ios: 'rectangle.stack.fill', material: 'style' },
  watchlist: { ios: 'star.fill', material: 'star' },
  account: { ios: 'person.crop.circle', material: 'account_circle' },
  pass: { ios: 'xmark', material: 'close' },
  watch: { ios: 'heart.fill', material: 'favorite' },
  info: { ios: 'info.circle', material: 'info' },
  trash: { ios: 'trash', material: 'delete' },
  reset: { ios: 'arrow.counterclockwise', material: 'history' },
  signOut: { ios: 'rectangle.portrait.and.arrow.right', material: 'logout' },
  website: { ios: 'safari', material: 'language' },
  mail: { ios: 'envelope', material: 'mail' },
  chevron: { ios: 'chevron.right', material: 'chevron_right' },
  chart: { ios: 'chart.line.uptrend.xyaxis', material: 'show_chart' },
} as const satisfies Record<string, { ios: SFSymbol; material: AndroidSymbol }>;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  color: ColorValue;
  style?: StyleProp<ViewStyle>;
}

export function Icon({ name, size = 24, color, style }: IconProps) {
  const icon = ICONS[name];
  return (
    <SymbolView
      name={{ ios: icon.ios, android: icon.material, web: icon.material }}
      size={size}
      tintColor={color}
      style={style}
    />
  );
}
