import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSummary } from '../../src/hooks/useSummary';
import {
  AgreementCard,
  FinancialCard,
  SectionHeader,
  EmptyState,
  LoadingState,
} from '../../src/components';
import { Colors, Spacing, Radii, FontSize, FontWeight, Shadow } from '../../src/theme';

function TrustScoreBadge({ score, level }: { score: number; level: string }) {
  const levelLabel: Record<string, string> = {
    VERY_LOW: 'Muito baixo',
    LOW: 'Baixo',
    MEDIUM: 'Médio',
    HIGH: 'Alto',
    VERY_HIGH: 'Muito alto',
    EXCELLENT: 'Excelente',
  };
  const levelColor: Record<string, string> = {
    VERY_LOW: Colors.danger,
    LOW: Colors.warning,
    MEDIUM: Colors.warning,
    HIGH: Colors.accent,
    VERY_HIGH: Colors.accent,
    EXCELLENT: Colors.primary,
  };
  const color = levelColor[level] ?? Colors.textMuted;
  return (
    <View style={[scoreStyles.badge, { borderColor: color }]}>
      <View style={[scoreStyles.dot, { backgroundColor: color }]} />
      <Text style={[scoreStyles.score, { color }]}>{score}</Text>
      <Text style={[scoreStyles.label, { color }]}>{levelLabel[level] ?? level}</Text>
    </View>
  );
}

const scoreStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.full,
    borderWidth: 1.5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  score: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  label: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
});

export default function HomeScreen() {
  const { summary, loading, error, refresh } = useSummary();

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleShareKey(key: string) {
    try {
      await Share.share({
        message: `Minha chave Selo: @${key}\nUse o app Selo para criar combinados comigo.`,
      });
    } catch {
      // silencioso
    }
  }

  function handleCopyKey(key: string) {
    Alert.alert('Minha chave', `@${key}`, [{ text: 'OK' }]);
  }

  if (loading && !summary) {
    return <LoadingState fullscreen message="Carregando sua carteira..." />;
  }

  const user = summary?.user;
  const financials = summary?.financials;
  const totals = summary?.totals;
  const sections = summary?.sections;
  const receivingKey = summary?.receivingKey;

  const firstName = user?.displayName?.split(' ')[0] ?? 'você';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá, {firstName} 👋</Text>
            <Text style={styles.tagline}>A carteira dos seus combinados</Text>
          </View>
          {user?.trustScore && (
            <TrustScoreBadge
              score={user.trustScore.score}
              level={user.trustScore.level}
            />
          )}
        </View>

        {/* Receiving key chip */}
        {receivingKey && (
          <View style={styles.keyRow}>
            <View style={styles.keyChip}>
              <Ionicons name="key-outline" size={14} color={Colors.textOnDarkMuted} />
              <Text style={styles.keyText}>@{receivingKey.key}</Text>
            </View>
            <TouchableOpacity
              style={styles.keyAction}
              onPress={() => handleCopyKey(receivingKey.key)}
            >
              <Ionicons name="copy-outline" size={14} color={Colors.textOnDarkMuted} />
              <Text style={styles.keyActionText}>Copiar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.keyAction}
              onPress={() => handleShareKey(receivingKey.key)}
            >
              <Ionicons name="share-outline" size={14} color={Colors.textOnDarkMuted} />
              <Text style={styles.keyActionText}>Compartilhar</Text>
            </TouchableOpacity>
          </View>
        )}

        {error && !summary && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={refresh} style={styles.retryBtn}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Financial summary */}
        {financials && (
          <View style={styles.financialsRow}>
            <FinancialCard
              label="A receber"
              amount={financials.amountsToReceive.total}
              currency={financials.amountsToReceive.currency}
              count={financials.amountsToReceive.count}
              icon="arrow-down-circle-outline"
              color={Colors.accent}
              bgColor={Colors.accentLight}
            />
            <View style={styles.financialGap} />
            <FinancialCard
              label="A pagar"
              amount={financials.amountsToPay.total}
              currency={financials.amountsToPay.currency}
              count={financials.amountsToPay.count}
              icon="arrow-up-circle-outline"
              color={Colors.warning}
              bgColor={Colors.warningLight}
            />
            <View style={styles.financialGap} />
            <FinancialCard
              label="Protegido"
              amount={financials.protectedAmounts.total}
              currency={financials.protectedAmounts.currency}
              count={financials.protectedAmounts.count}
              icon="shield-checkmark-outline"
              color={Colors.primary}
              bgColor={Colors.primaryGlow}
            />
          </View>
        )}

        {/* Stats row */}
        {totals && (
          <View style={styles.statsRow}>
            <StatChip
              label="Ativos"
              value={totals.activeAgreements}
              color={Colors.accent}
            />
            <StatChip
              label="Com garantia"
              value={totals.withGuarantee}
              color={Colors.primary}
            />
            {totals.inDispute > 0 && (
              <StatChip label="Em disputa" value={totals.inDispute} color={Colors.danger} />
            )}
            {totals.dueSoon > 0 && (
              <StatChip label="Vence em breve" value={totals.dueSoon} color={Colors.warning} />
            )}
          </View>
        )}

        {/* Banner de ambiente de teste */}
        <View style={styles.betaBanner}>
          <Ionicons name="flask-outline" size={13} color="#92400E" />
          <Text style={styles.betaText}>
            Ambiente de teste — nenhum dinheiro real é movimentado.
          </Text>
        </View>

        {/* Aviso: sem chave de recebimento */}
        {!receivingKey && !loading && (
          <TouchableOpacity
            style={styles.noKeyBanner}
            onPress={() => router.push('/(app)/profile')}
            activeOpacity={0.85}
          >
            <Ionicons name="key-outline" size={16} color={Colors.primary} />
            <Text style={styles.noKeyText}>
              Configure sua Chave de Recebimento para criar combinados →
            </Text>
          </TouchableOpacity>
        )}

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <QuickAction
            icon="add-circle"
            label="Criar combinado"
            color={Colors.primary}
            onPress={() => router.push('/(app)/create')}
          />
          <QuickAction
            icon="list"
            label="Ver todos"
            color={Colors.info}
            onPress={() => router.push('/(app)/agreements')}
          />
          {receivingKey ? (
            <QuickAction
              icon="share-social"
              label="Minha chave"
              color={Colors.accent}
              onPress={() => handleShareKey(receivingKey.key)}
            />
          ) : (
            <QuickAction
              icon="key-outline"
              label="Criar chave"
              color={Colors.accent}
              onPress={() => router.push('/(app)/profile')}
            />
          )}
        </View>

        {/* Aguardando você */}
        {sections && sections.pendingMyAction.length > 0 && (
          <View>
            <SectionHeader
              title="Aguardando você"
              count={totals?.pendingMyAction}
              onSeeAll={() => router.push('/(app)/agreements')}
            />
            {sections.pendingMyAction.map((item) => (
              <AgreementCard key={item.id} item={item} />
            ))}
          </View>
        )}

        {/* Em disputa */}
        {sections && sections.inDispute.length > 0 && (
          <View>
            <SectionHeader title="Em disputa" count={totals?.inDispute} />
            {sections.inDispute.map((item) => (
              <AgreementCard key={item.id} item={item} />
            ))}
          </View>
        )}

        {/* Recentes */}
        {sections && (
          <View>
            <SectionHeader
              title="Recentes"
              onSeeAll={() => router.push('/(app)/agreements')}
            />
            {sections.recent.length === 0 ? (
              <EmptyState
                icon="document-outline"
                title="Nenhum combinado ainda"
                subtitle="Crie seu primeiro combinado tocando no botão + abaixo."
              />
            ) : (
              sections.recent.map((item) => <AgreementCard key={item.id} item={item} />)
            )}
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[chipStyles.chip, { borderColor: color + '33' }]}>
      <Text style={[chipStyles.value, { color }]}>{value}</Text>
      <Text style={chipStyles.label}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    flex: 1,
    ...Shadow.sm,
  },
  value: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
});

function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={qaStyles.item} onPress={onPress} activeOpacity={0.7}>
      <View style={[qaStyles.iconWrap, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={qaStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const qaStyles = StyleSheet.create({
  item: { alignItems: 'center', flex: 1 },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: FontWeight.medium,
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgDark },
  scroll: { flex: 1, backgroundColor: Colors.bgBase },
  content: { paddingBottom: Spacing.xxl },
  header: {
    backgroundColor: Colors.bgDark,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  tagline: {
    fontSize: FontSize.sm,
    color: Colors.textOnDarkMuted,
    marginTop: 2,
  },
  keyRow: {
    backgroundColor: Colors.bgDarkCard,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  keyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  keyText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  keyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.bgDark,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  keyActionText: {
    fontSize: FontSize.xs,
    color: Colors.textOnDarkMuted,
    fontWeight: FontWeight.medium,
  },
  errorBox: {
    margin: Spacing.lg,
    backgroundColor: Colors.dangerLight,
    borderRadius: Radii.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  errorText: { color: Colors.danger, fontSize: FontSize.sm, textAlign: 'center' },
  retryBtn: { marginTop: Spacing.sm },
  retryText: { color: Colors.danger, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  financialsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
    marginTop: -Spacing.md,
    zIndex: 1,
  },
  financialGap: { width: 0 },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  quickRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bgCard,
    marginHorizontal: Spacing.lg,
    borderRadius: Radii.lg,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  betaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 3,
    borderLeftColor: '#D97706',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderRadius: Radii.sm,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  betaText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: '#78350F',
    fontWeight: FontWeight.medium,
  },
  noKeyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryGlow,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderRadius: Radii.md,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  noKeyText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  bottomPad: { height: Spacing.xl },
});
