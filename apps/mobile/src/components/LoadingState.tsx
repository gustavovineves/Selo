import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize } from '../theme';

interface Props {
  message?: string;
  fullscreen?: boolean;
}

export function LoadingState({ message, fullscreen = false }: Props) {
  return (
    <View style={[styles.container, fullscreen && styles.fullscreen]}>
      <ActivityIndicator size="large" color={Colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

// Skeleton simplificado para listas
export function SkeletonCard() {
  return (
    <View style={styles.skeleton}>
      <View style={[styles.skeletonLine, { width: '70%' }]} />
      <View style={[styles.skeletonLine, { width: '40%', marginTop: 8 }]} />
      <View style={[styles.skeletonLine, { width: '55%', marginTop: 12 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  fullscreen: {
    flex: 1,
    backgroundColor: Colors.bgBase,
  },
  message: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  skeleton: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: Colors.borderLight,
    borderRadius: 6,
  },
});
