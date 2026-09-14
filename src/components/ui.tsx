import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors, font, radius, space, weight } from '@/theme';

// --- text ------------------------------------------------------------------------

export function Heading({ children, level = 1 }: { children: React.ReactNode; level?: 1 | 2 | 3 }) {
  const size = level === 1 ? font.xxl : level === 2 ? font.xl : font.lg;
  return <Text style={[s.heading, { fontSize: size }]}>{children}</Text>;
}

export function Muted({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <Text style={[s.muted, style]}>{children}</Text>;
}

// --- containers ------------------------------------------------------------------

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Row({
  children,
  gap = space.md,
  wrap = true,
  align = 'center',
  style,
}: {
  children: React.ReactNode;
  gap?: number;
  wrap?: boolean;
  align?: ViewStyle['alignItems'];
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        { flexDirection: 'row', gap, alignItems: align, flexWrap: wrap ? 'wrap' : 'nowrap' },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// --- controls --------------------------------------------------------------------

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  small,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        s.button,
        small && s.buttonSmall,
        variant === 'primary' && s.buttonPrimary,
        variant === 'secondary' && s.buttonSecondary,
        variant === 'danger' && s.buttonDanger,
        variant === 'ghost' && s.buttonGhost,
        pressed && !isDisabled && s.buttonPressed,
        isDisabled && s.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : colors.primary} />
      ) : (
        <Text
          style={[
            s.buttonText,
            small && { fontSize: font.sm },
            (variant === 'secondary' || variant === 'ghost') && { color: colors.primary },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: space.xs, flexGrow: 1, minWidth: 180 }}>
      <Text style={s.label}>{label}</Text>
      {children}
      {hint && !error ? <Text style={s.hint}>{hint}</Text> : null}
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.textSubtle}
      {...props}
      style={[s.input, props.style]}
    />
  );
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const tones = {
    neutral: { bg: colors.surfaceMuted, fg: colors.textMuted },
    success: { bg: colors.successSubtle, fg: colors.success },
    warning: { bg: colors.warningSubtle, fg: colors.warning },
    danger: { bg: colors.dangerSubtle, fg: colors.danger },
    info: { bg: colors.primarySubtle, fg: colors.primary },
  } as const;
  const { bg, fg } = tones[tone];
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[s.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

// --- states ----------------------------------------------------------------------

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={s.centered}>
      <ActivityIndicator color={colors.primary} />
      <Muted>{label}</Muted>
    </View>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={s.centered}>
      <Text style={s.emptyTitle}>{title}</Text>
      {hint ? <Muted>{hint}</Muted> : null}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <View style={s.centered}>
      <Text style={s.errorTitle}>{message}</Text>
      {onRetry ? <Button title="Try again" variant="secondary" onPress={onRetry} small /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  heading: { color: colors.text, fontWeight: weight.bold },
  muted: { color: colors.textMuted, fontSize: font.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
  },
  button: {
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  buttonSmall: { paddingVertical: space.sm, paddingHorizontal: space.md, minHeight: 32 },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  buttonDanger: { backgroundColor: colors.danger },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.textInverse, fontWeight: weight.semibold, fontSize: font.md },
  label: { color: colors.text, fontSize: font.sm, fontWeight: weight.medium },
  hint: { color: colors.textSubtle, fontSize: font.xs },
  error: { color: colors.danger, fontSize: font.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    fontSize: font.md,
    color: colors.text,
    backgroundColor: colors.surface,
    minHeight: 40,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: font.xs, fontWeight: weight.semibold },
  centered: { padding: space.xxl, alignItems: 'center', gap: space.sm },
  emptyTitle: { fontSize: font.md, fontWeight: weight.medium, color: colors.text },
  errorTitle: { fontSize: font.md, color: colors.danger, textAlign: 'center' },
});
