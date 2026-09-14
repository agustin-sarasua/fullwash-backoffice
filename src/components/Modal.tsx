import React from 'react';
import { Modal as RNModal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme';
import { Heading } from './ui';

export function Modal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        {/* Stop the press from reaching the backdrop: clicking inside a dialog must not
            close it, which is otherwise the most common way to lose a half-typed form. */}
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <Heading level={3}>{title}</Heading>
          <ScrollView contentContainerStyle={{ gap: space.md }}>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.xl,
    gap: space.lg,
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
  },
});
