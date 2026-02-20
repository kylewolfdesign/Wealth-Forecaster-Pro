import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import Colors from '@/constants/colors';
import { borderRadius, spacing } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
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
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.97 : 1 }]}>
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
    borderWidth: 1,
    borderColor: Colors.border,
    padding: spacing.lg,
  },
  noPadding: {
    padding: 0,
  },
});
