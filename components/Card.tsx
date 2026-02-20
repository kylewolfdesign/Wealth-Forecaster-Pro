import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import Colors from '@/constants/colors';
import { borderRadius, shadow, spacing } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  noPadding?: boolean;
}

export default function Card({ children, style, onPress, noPadding }: CardProps) {
  const content = (
    <View style={[styles.card, noPadding && styles.noPadding, style]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.95 : 1 }]}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadow.sm,
  },
  noPadding: {
    padding: 0,
  },
});
