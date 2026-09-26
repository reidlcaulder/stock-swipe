import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

interface StockLogoProps {
  symbol: string;
  logoUrl: string | null;
  size?: number;
}

export function StockLogo({ symbol, logoUrl, size = 44 }: StockLogoProps) {
  const [failed, setFailed] = useState(false);
  const frame = { width: size, height: size, borderRadius: size * 0.28 };

  if (logoUrl && !failed) {
    return (
      <View style={[styles.imageFrame, frame]}>
        <Image
          source={logoUrl}
          style={styles.image}
          contentFit="contain"
          onError={() => setFailed(true)}
          accessibilityLabel={`${symbol} logo`}
        />
      </View>
    );
  }

  return (
    <View style={[styles.fallback, frame]}>
      <Text style={[styles.fallbackText, { fontSize: size * 0.4 }]}>{symbol.slice(0, 1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  imageFrame: { backgroundColor: colors.white, overflow: 'hidden', padding: 4 },
  image: { flex: 1 },
  fallback: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: { color: colors.accent, fontWeight: '800' },
});
