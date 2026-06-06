import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { notificationsService, notifyUnreadCountChanged } from '../../src/services/notifications.service';
import { EmptyState, LoadingState } from '../../src/components';
import { Colors, Spacing, Radii, FontSize, FontWeight, Shadow } from '../../src/theme';
import { mapError } from '../../src/utils/errors';
import type { AppNotification, NotificationType } from '../../src/types/api';

// ── Mapeamento de ícone e cor por tipo ────────────────────────────

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: string; color: string; label: string }
> = {
  AGREEMENT_RECEIVED:    { icon: 'document-text-outline', color: Colors.primary,    label: 'Combinado recebido' },
  AGREEMENT_ACCEPTED:    { icon: 'checkmark-circle-outline', color: Colors.accent,  label: 'Aceito' },
  AGREEMENT_REJECTED:    { icon: 'close-circle-outline', color: Colors.danger,       label: 'Recusado' },
  AGREEMENT_COMPLETED:   { icon: 'ribbon-outline', color: Colors.accent,             label: 'Concluído' },
  AGREEMENT_CANCELLED:   { icon: 'ban-outline', color: Colors.textMuted,             label: 'Cancelado' },
  AGREEMENT_EXPIRED:     { icon: 'time-outline', color: Colors.warning,              label: 'Vencido' },
  PAYMENT_RECEIVED:      { icon: 'cash-outline', color: Colors.accent,               label: 'Pagamento' },
  FUNDS_LOCKED:          { icon: 'lock-closed-outline', color: Colors.primary,       label: 'Valor protegido' },
  PAYOUT_SENT:           { icon: 'arrow-up-circle-outline', color: Colors.accent,    label: 'Liberado' },
  REFUND_PROCESSED:      { icon: 'return-down-back-outline', color: Colors.warning,  label: 'Reembolso' },
  DISPUTE_OPENED:        { icon: 'alert-circle-outline', color: Colors.danger,       label: 'Contestação' },
  DISPUTE_RESOLVED:      { icon: 'checkmark-done-outline', color: Colors.primary,    label: 'Análise concluída' },
  TRUST_SCORE_UPDATED:   { icon: 'star-outline', color: Colors.warning,              label: 'Score' },
  SYSTEM_ALERT:          { icon: 'information-circle-outline', color: Colors.textMuted, label: 'Aviso' },
};

function formatRelativeDate(isoString: string): string {
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min atrás`;
  if (diffH < 24) return `${diffH}h atrás`;
  if (diffD === 1) return 'ontem';
  if (diffD < 7) return `${diffD} dias atrás`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function NotificationItem({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
}) {
  const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.SYSTEM_ALERT;
  const isUnread = item.status === 'UNREAD';

  return (
    <TouchableOpacity
      style={[styles.item, isUnread && styles.itemUnread]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: config.color + '18' }]}>
        <Ionicons name={config.icon as any} size={22} color={config.color} />
      </View>
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={[styles.itemTitle, isUnread && styles.itemTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          {isUnread && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.itemBody} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.itemDate}>{formatRelativeDate(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifications.filter((n) => n.status === 'UNREAD').length;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await notificationsService.list({ limit: 50 });
      setNotifications(res.data);
      setTotal(res.total);
      // Atualiza badge na navegação
      const unread = res.data.filter((n) => n.status === 'UNREAD').length;
      notifyUnreadCountChanged(unread);
    } catch (e) {
      setError(mapError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Recarrega sempre que a tela fica em foco
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function handlePress(item: AppNotification) {
    // Marca como lida se ainda não estiver
    if (item.status === 'UNREAD') {
      try {
        await notificationsService.markAsRead(item.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === item.id ? { ...n, status: 'READ', readAt: new Date().toISOString() } : n,
          ),
        );
        const remaining = notifications.filter((n) => n.status === 'UNREAD' && n.id !== item.id).length;
        notifyUnreadCountChanged(remaining);
      } catch {
        // não bloqueia a navegação
      }
    }

    // Navega para o acordo relacionado, se houver
    const agreementId = (item.data as Record<string, unknown> | null)?.agreementId;
    if (agreementId && typeof agreementId === 'string') {
      router.push(`/agreement/${agreementId}`);
    }
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, status: 'READ', readAt: new Date().toISOString() })),
      );
    } catch {
      // silencia
    } finally {
      setMarkingAll(false);
    }
  }

  if (loading) {
    return <LoadingState message="Carregando atividades..." />;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <EmptyState
          icon="cloud-offline-outline"
          title="Não foi possível carregar"
          subtitle={error}
        />
        <TouchableOpacity onPress={() => load()} style={styles.retryButton} activeOpacity={0.7}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Barra de ações */}
      <View style={styles.actionBar}>
        <Text style={styles.countLabel}>
          {total} {total !== 1 ? 'atividades' : 'atividade'}
          {unreadCount > 0 ? ` · ${unreadCount} não ${unreadCount !== 1 ? 'lidas' : 'lida'}` : ''}
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllRead}
            disabled={markingAll}
            activeOpacity={0.7}
            style={styles.markAllBtn}
          >
            {markingAll ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.markAllText}>Marcar todas como lidas</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationItem item={item} onPress={handlePress} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="Nenhuma atividade"
            subtitle="Quando algo importante acontecer nos seus combinados, você verá aqui."
          />
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgBase,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  countLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    flex: 1,
  },
  markAllBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  markAllText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  list: {
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    gap: Spacing.md,
  },
  itemUnread: {
    backgroundColor: Colors.primary + '06',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  itemTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    flex: 1,
  },
  itemTitleUnread: {
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    flexShrink: 0,
  },
  itemBody: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  itemDate: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: Spacing.lg + 44 + Spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  retryButton: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
  },
  retryText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
