import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useProfile } from '../../src/hooks/useProfile';
import { authService } from '../../src/services/auth.service';
import { LoadingState, EmptyState } from '../../src/components';
import { Colors, Spacing, Radii, FontSize, FontWeight, Shadow } from '../../src/theme';
import type { TrustScoreLevel } from '../../src/types/api';

const LEVEL_LABEL: Record<TrustScoreLevel, string> = {
  VERY_LOW: 'Muito baixo',
  LOW: 'Baixo',
  MEDIUM: 'Médio',
  HIGH: 'Alto',
  VERY_HIGH: 'Muito alto',
  EXCELLENT: 'Excelente',
};

const LEVEL_COLOR: Record<TrustScoreLevel, string> = {
  VERY_LOW: Colors.danger,
  LOW: Colors.warning,
  MEDIUM: Colors.warning,
  HIGH: Colors.accent,
  VERY_HIGH: Colors.accent,
  EXCELLENT: Colors.primary,
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export default function ProfileScreen() {
  const { profile, loading, error, refresh } = useProfile();

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleLogout() {
    Alert.alert('Sair', 'Tem certeza que deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  function handleCopyKey(key: string) {
    Alert.alert('Minha chave Selo', `@${key}`, [{ text: 'OK' }]);
  }

  async function handleShareKey(key: string) {
    try {
      await Share.share({
        message: `Minha chave Selo: @${key}\nBaixe o app Selo e crie combinados comigo!`,
      });
    } catch {
      // silencioso
    }
  }

  if (loading && !profile) {
    return <LoadingState fullscreen message="Carregando perfil..." />;
  }

  if (error && !profile) {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        title="Erro ao carregar perfil"
        subtitle={error}
      />
    );
  }

  const me = profile?.me;
  const receivingKey = profile?.receivingKey;
  const destinations = profile?.destinations ?? [];

  const name = me?.profile?.fullName ?? me?.email ?? 'Usuário';
  const displayName = me?.profile?.displayName ?? name;
  const initials = getInitials(displayName);
  const trustScore = me?.trustScore;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={refresh}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar + name */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{me?.email}</Text>

        {trustScore && (
          <View
            style={[
              styles.scoreBadge,
              { borderColor: LEVEL_COLOR[trustScore.level] + '44' },
            ]}
          >
            <View
              style={[styles.scoreDot, { backgroundColor: LEVEL_COLOR[trustScore.level] }]}
            />
            <Text style={[styles.scoreValue, { color: LEVEL_COLOR[trustScore.level] }]}>
              {trustScore.score}
            </Text>
            <Text style={styles.scoreLabel}>
              {LEVEL_LABEL[trustScore.level]} · Score de confiança
            </Text>
          </View>
        )}
      </View>

      {/* Receiving Key */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Minha chave Selo</Text>
        {receivingKey ? (
          <View style={styles.keyCard}>
            <View style={styles.keyInfo}>
              <Ionicons name="key-outline" size={18} color={Colors.primary} />
              <Text style={styles.keyValue}>@{receivingKey.key}</Text>
            </View>
            <View style={styles.keyActions}>
              <TouchableOpacity
                style={styles.keyBtn}
                onPress={() => handleCopyKey(receivingKey.key)}
              >
                <Ionicons name="copy-outline" size={16} color={Colors.primary} />
                <Text style={styles.keyBtnText}>Copiar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.keyBtn}
                onPress={() => handleShareKey(receivingKey.key)}
              >
                <Ionicons name="share-outline" size={16} color={Colors.primary} />
                <Text style={styles.keyBtnText}>Compartilhar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nenhuma chave configurada</Text>
          </View>
        )}
      </View>

      {/* Destinations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Destino de recebimento</Text>
        {destinations.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nenhum destino configurado</Text>
            <Text style={styles.emptyHint}>
              Configure um destino para receber valores em acordos com garantia.
            </Text>
          </View>
        ) : (
          destinations.map((dest) => (
            <View key={dest.id} style={styles.destCard}>
              <View style={styles.destInfo}>
                <View style={styles.destTypeWrap}>
                  <Text style={styles.destType}>{dest.type.replace('PIX_', '')}</Text>
                </View>
                <View>
                  <Text style={styles.destMasked}>{dest.maskedValue}</Text>
                  {dest.label && <Text style={styles.destLabel}>{dest.label}</Text>}
                </View>
              </View>
              {dest.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultText}>Padrão</Text>
                </View>
              )}
            </View>
          ))
        )}
      </View>

      {/* Settings + Logout */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Configurações', 'Em breve.')}>
          <Ionicons name="settings-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.menuText}>Configurações</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, styles.menuItemDanger]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={[styles.menuText, styles.menuTextDanger]}>Sair</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.danger} />
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgBase },
  content: { paddingBottom: Spacing.xxl },
  avatarSection: {
    backgroundColor: Colors.bgDark,
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  initials: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  name: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  email: {
    fontSize: FontSize.sm,
    color: Colors.textOnDarkMuted,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radii.full,
    borderWidth: 1.5,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
  },
  scoreDot: { width: 8, height: 8, borderRadius: 4 },
  scoreValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  scoreLabel: { fontSize: FontSize.xs, color: Colors.textOnDarkMuted, fontWeight: FontWeight.medium },

  section: {
    backgroundColor: Colors.bgCard,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  keyCard: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  keyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  keyValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  keyActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  keyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryGlow,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
  },
  keyBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },

  emptyCard: { padding: Spacing.md },
  emptyText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  emptyHint: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4, lineHeight: 16 },

  destCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  destInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  destTypeWrap: {
    backgroundColor: Colors.primaryGlow,
    borderRadius: Radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  destType: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.primary },
  destMasked: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  destLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  defaultBadge: {
    backgroundColor: Colors.accentLight,
    borderRadius: Radii.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  defaultText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.accent },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  menuItemDanger: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  menuText: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: FontWeight.medium },
  menuTextDanger: { color: Colors.danger },

  bottomPad: { height: Spacing.xl },
});
