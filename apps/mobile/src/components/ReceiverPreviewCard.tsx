import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radii, FontSize, FontWeight, Shadow } from '../theme';
import type { ResolveKeyResponse } from '../types/api';

interface Props {
  receiver: ResolveKeyResponse;
}

export function ReceiverPreviewCard({ receiver }: Props) {
  const initials = (receiver.displayName ?? receiver.key)
    .replace('@', '')
    .split(' ')
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');

  const name = receiver.displayName ?? receiver.key;

  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.confirmLabel}>Recebedor confirmado</Text>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.key}>{receiver.key}</Text>
      </View>
      <View style={styles.checkWrap}>
        <Ionicons name="checkmark-circle" size={24} color={Colors.accent} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.accentLight,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    ...Shadow.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  info: { flex: 1 },
  confirmLabel: {
    fontSize: FontSize.xs,
    color: Colors.accent,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  key: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  checkWrap: {
    width: 32,
    alignItems: 'center',
  },
});
