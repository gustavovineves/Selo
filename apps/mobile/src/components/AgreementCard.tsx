import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radii, FontSize, FontWeight, Shadow } from '../theme';
import { StatusBadge } from './StatusBadge';
import type { AgreementSummaryItem, AgreementListItem } from '../types/api';

type AgreementItem = AgreementSummaryItem | AgreementListItem;

interface Props {
  item: AgreementItem;
  onPress?: () => void;
  compact?: boolean;
}

function formatCurrency(amount: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function getCounterpartyName(item: AgreementItem): string | null {
  if ('counterpartyName' in item && item.counterpartyName) return item.counterpartyName;
  if ('participants' in item) {
    const other = item.participants?.find((p) => p.role !== 'CREATOR');
    return other?.user?.profile?.displayName ?? other?.user?.profile?.fullName ?? null;
  }
  return null;
}

function hasGuarantee(item: AgreementItem): boolean {
  return item.type === 'WITH_GUARANTEE';
}

function isInDispute(item: AgreementItem): boolean {
  if ('financialStatus' in item) return item.financialStatus === 'DISPUTED';
  return false;
}

export function AgreementCard({ item, onPress, compact = false }: Props) {
  const counterparty = getCounterpartyName(item);
  const guarantee = hasGuarantee(item);
  const dispute = isInDispute(item);

  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.cardCompact]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          {guarantee && (
            <View style={styles.guaranteeBadge}>
              <Ionicons name="shield-checkmark" size={12} color={Colors.primary} />
            </View>
          )}
          {dispute && (
            <View style={styles.disputeBadge}>
              <Ionicons name="warning" size={12} color={Colors.danger} />
            </View>
          )}
        </View>
        {item.amount !== null && item.amount !== undefined && (
          <Text style={styles.amount}>{formatCurrency(item.amount, item.currency)}</Text>
        )}
      </View>

      {counterparty && (
        <Text style={styles.counterparty} numberOfLines={1}>
          <Ionicons name="person-outline" size={12} color={Colors.textMuted} /> {counterparty}
        </Text>
      )}

      <View style={styles.footer}>
        <StatusBadge
          operationalStatus={item.operationalStatus}
          financialStatus={item.financialStatus}
          size="sm"
        />
        {item.dueDate && (
          <Text style={styles.due}>
            <Ionicons name="calendar-outline" size={11} color={Colors.textMuted} />{' '}
            {formatDate(item.dueDate)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  cardCompact: {
    padding: Spacing.sm + Spacing.xs,
    marginBottom: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    flex: 1,
  },
  guaranteeBadge: {
    backgroundColor: Colors.primaryGlow,
    borderRadius: Radii.full,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disputeBadge: {
    backgroundColor: Colors.dangerLight,
    borderRadius: Radii.full,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  counterparty: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  due: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});
