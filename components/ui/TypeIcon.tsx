import { StyleSheet, View } from 'react-native';
import { colors } from '../../constants/theme';

type IconName = 'diamond' | 'circle' | 'arrow-up' | 'moncem';

interface TypeIconProps {
  name: IconName;
  size?: number;
  color?: string;
}

// Pure View-based geometric icons — no emoji fallback, no SVG library required.
// Each shape is constructed from styled Views so they render identically on
// iOS, Android, and any device regardless of emoji/Unicode font coverage.

export default function TypeIcon({ name, size = 12, color = colors.gold }: TypeIconProps) {
  if (name === 'diamond') {
    // Filled rotated square
    const s = size * 0.72;
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: s, height: s,
          backgroundColor: color,
          transform: [{ rotate: '45deg' }],
        }} />
      </View>
    );
  }

  if (name === 'circle') {
    // Outlined circle
    return (
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: size * 0.12, borderColor: color,
      }} />
    );
  }

  if (name === 'arrow-up') {
    // Upward triangle
    const half = size / 2;
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: 0, height: 0,
          borderLeftWidth: half * 0.7,
          borderRightWidth: half * 0.7,
          borderBottomWidth: size * 0.85,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
        }} />
      </View>
    );
  }

  // 'moncem' — diamond with inner circle (◈ equivalent)
  const ds = size * 0.72;
  const cs = size * 0.28;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: ds, height: ds,
        backgroundColor: color,
        transform: [{ rotate: '45deg' }],
        alignItems: 'center', justifyContent: 'center',
      }}>
        <View style={{
          width: cs, height: cs, borderRadius: cs / 2,
          backgroundColor: colors.parchment,
          transform: [{ rotate: '-45deg' }],
        }} />
      </View>
    </View>
  );
}

export const styles = StyleSheet.create({});
