import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { colors, radius, spacing } from '@/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
}: ButtonProps) {
  const inactive = disabled || loading;
  const foreground = variant === 'primary' ? colors.white : variant === 'danger' ? colors.down : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        (pressed || inactive) && styles.dimmed,
      ]}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={foreground} />
        ) : (
          <>
            {icon && <Icon name={icon} size={18} color={foreground} />}
            <Text style={[styles.label, { color: foreground }]}>{label}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  dimmed: { opacity: 0.6 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  label: { fontSize: 16, fontWeight: '800' },
});
