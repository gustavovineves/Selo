import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { StatusBadge, LoadingState, PrimaryButton } from '../../src/components';
import { agreementsService } from '../../src/services/agreements.service';
import { Colors, Spacing, Radii, FontSize, FontWeight, Shadow } from '../../src/theme';
import type { AgreementDetail } from '../../src/types/api';

async function getCurrentUserId(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync('accessToken');
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

function formatDateForDisplay(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function formatCurrency(amount: number | string | null | undefined, currency = 'BRL'): string {
  if (amount === null || amount === undefined) return '—';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '—';
  return `R$ ${num.toFixed(2).replace('.', ',')}`;
}

const FINANCIAL_STATUS_LABELS: Record<string, string> = {
  NOT_APPLICABLE: 'Sem garantia',
  AWAITING_PAYMENT: 'Aguardando pagamento',
  FUNDS_HELD: 'Valor protegido',
  AWAITING_PAYOUT: 'Aguardando repasse',
  PAID_OUT: 'Valor liberado',
  AWAITING_REFUND: 'Aguardando reembolso',
  REFUNDED: 'Reembolsado',
  DISPUTED: 'Em disputa',
};

const GUARANTEE_STATUS_LABELS: Record<string, string> = {
  AWAITING_PAYMENT: 'Aguardando pagamento',
  LOCKED: 'Valor protegido',
  AWAITING_PAYOUT: 'Aguardando repasse',
  PAID_OUT: 'Valor liberado',
  AWAITING_REFUND: 'Aguardando reembolso',
  REFUNDED: 'Reembolsado',
  FROZEN_DISPUTE: 'Travado em disputa',
};

export default function AgreementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [agreement, setAgreement] = useState<AgreementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const [agreement, userId] = await Promise.all([
        agreementsService.getById(id),
        getCurrentUserId(),
      ]);
      setAgreement(agreement);
      setCurrentUserId(userId);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar o acordo.';
      if (msg.includes('403') || msg.toLowerCase().includes('acesso')) {
        setError('Você não tem acesso a este acordo.');
      } else if (msg.includes('404') || msg.toLowerCase().includes('não encontrado')) {
        setError('Acordo não encontrado.');
      } else {
        setError('Não foi possível carregar o acordo. Tente novamente.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function handleRefresh() {
    setRefreshing(true);
    void loadData();
  }

  async function handleAction(
    action: 'accept' | 'decline' | 'cancel' | 'complete' | 'confirmCompletion',
    label: string,
    confirmMsg?: string,
  ) {
    if (confirmMsg) {
      Alert.alert(label, confirmMsg, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: action === 'cancel' || action === 'decline' ? 'destructive' : 'default',
          onPress: () => void doAction(action, label),
        },
      ]);
    } else {
      void doAction(action, label);
    }
  }

  async function doAction(
    action: 'accept' | 'decline' | 'cancel' | 'complete' | 'confirmCompletion',
    label: string,
  ) {
    if (!id) return;
    setActionLoading(action);
    setActionError(null);
    try {
      switch (action) {
        case 'accept':
          await agreementsService.accept(id);
          break;
        case 'decline':
          await agreementsService.decline(id);
          break;
        case 'cancel':
          await agreementsService.cancel(id);
          break;
        case 'complete':
          await agreementsService.complete(id);
          break;
        case 'confirmCompletion':
          await agreementsService.confirmCompletion(id);
          break;
      }
      await loadData();
      Alert.alert('Feito!', `${label} realizado com sucesso.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido.';
      setActionError(msg);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return <LoadingState fullscreen message="Carregando combinado..." />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.errorScreen}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.danger} />
          <Text style={styles.errorScreenText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); void loadData(); }}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!agreement) return null;

  const isGuaranteed = agreement.type === 'WITH_GUARANTEE';
  const isCreator = agreement.createdById === currentUserId;
  const isCounterpart = agreement.participants.some(
    (p) => p.userId === currentUserId && p.role === 'COUNTERPART',
  );
  const myParticipant = agreement.participants.find((p) => p.userId === currentUserId);

  const ops = agreement.operationalStatus;
  const fin = agreement.financialStatus;
  const guarantee = agreement.financialGuarantee[0];
  const dispute = agreement.dispute[0];

  const counterpart = agreement.participants.find((p) => p.role === 'COUNTERPART');
  const creator = agreement.participants.find((p) => p.role === 'CREATOR');

  function getParticipantName(p: typeof counterpart): string {
    if (!p) return '—';
    return p.user?.profile?.displayName ?? p.user?.profile?.fullName ?? 'Usuário';
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header card */}
        <View style={styles.headerCard}>
          <View style={styles.headerBadges}>
            <View style={styles.typePill}>
              <Ionicons
                name={isGuaranteed ? 'shield-checkmark-outline' : 'document-text-outline'}
                size={13}
                color={Colors.primary}
              />
              <Text style={styles.typePillText}>
                {isGuaranteed ? 'Com garantia' : 'Acordo simples'}
              </Text>
            </View>
          </View>
          <Text style={styles.title}>{agreement.title}</Text>
          <View style={styles.statusRow}>
            <StatusBadge
              operationalStatus={agreement.operationalStatus}
              financialStatus={agreement.financialStatus}
            />
          </View>
          {agreement.generatedSummary && (
            <Text style={styles.generatedSummary}>{agreement.generatedSummary}</Text>
          )}
        </View>

        {/* Financial highlight */}
        {agreement.amount && (
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>
              {isGuaranteed ? 'Valor protegido' : 'Valor do acordo'}
            </Text>
            <Text style={styles.amountValue}>
              {formatCurrency(agreement.amount, agreement.currency)}
            </Text>
            {isGuaranteed && guarantee && (
              <Text style={styles.guaranteeStatus}>
                {GUARANTEE_STATUS_LABELS[guarantee.status] ?? guarantee.status}
              </Text>
            )}
          </View>
        )}

        {/* Dispute alert */}
        {dispute && (
          <View style={styles.disputeAlert}>
            <Ionicons name="warning-outline" size={18} color={Colors.danger} />
            <View style={styles.disputeAlertContent}>
              <Text style={styles.disputeAlertTitle}>Disputa em aberto</Text>
              <Text style={styles.disputeAlertText}>
                {dispute.reason ?? 'Disputa aberta pelos participantes.'}
              </Text>
            </View>
          </View>
        )}

        {/* Parties */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Participantes</Text>
          <PartyRow
            label="Criador"
            name={getParticipantName(creator)}
            isMe={agreement.createdById === currentUserId}
            extraLabel={isGuaranteed ? 'Pagador' : undefined}
          />
          <PartyRow
            label="Contraparte"
            name={getParticipantName(counterpart)}
            isMe={isCounterpart}
            extraLabel={isGuaranteed ? 'Recebedor' : undefined}
            status={counterpart?.status}
          />
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalhes</Text>
          <DetailRow label="Prazo" value={formatDateForDisplay(agreement.dueDate)} />
          <DetailRow label="Criado em" value={formatDateForDisplay(agreement.createdAt)} />
          {agreement.description && (
            <DetailRow label="Observação" value={agreement.description} />
          )}
          {isGuaranteed && fin !== 'NOT_APPLICABLE' && (
            <DetailRow
              label="Status financeiro"
              value={FINANCIAL_STATUS_LABELS[fin] ?? fin}
            />
          )}
          {agreement.completedAt && (
            <DetailRow label="Concluído em" value={formatDateForDisplay(agreement.completedAt)} />
          )}
          {agreement.canceledAt && (
            <DetailRow label="Cancelado em" value={formatDateForDisplay(agreement.canceledAt)} />
          )}
        </View>

        {/* Payment section (WITH_GUARANTEE, ACTIVE, AWAITING_PAYMENT) */}
        {isGuaranteed && ops === 'ACTIVE' && fin === 'AWAITING_PAYMENT' && isCreator && (
          <View style={styles.paymentSection}>
            <Ionicons name="qr-code-outline" size={20} color={Colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentTitle}>Depositar valor protegido</Text>
              <Text style={styles.paymentText}>
                Após o aceite, você precisa realizar o depósito Pix para proteger o valor.
                Acesse o painel web ou aguarde a funcionalidade de Pix no app.
              </Text>
            </View>
          </View>
        )}

        {/* Action error */}
        {actionError && (
          <View style={styles.actionErrorBox}>
            <Ionicons name="alert-circle" size={16} color={Colors.danger} />
            <Text style={styles.actionErrorText}>{actionError}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <ActionButtons
            ops={ops}
            fin={fin}
            isCreator={isCreator}
            isCounterpart={isCounterpart}
            isGuaranteed={isGuaranteed}
            myParticipantStatus={myParticipant?.status}
            actionLoading={actionLoading}
            onAction={handleAction}
          />
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function PartyRow({
  label,
  name,
  isMe,
  extraLabel,
  status,
}: {
  label: string;
  name: string;
  isMe: boolean;
  extraLabel?: string;
  status?: string;
}) {
  return (
    <View style={styles.partyRow}>
      <View style={styles.partyAvatar}>
        <Text style={styles.partyAvatarText}>
          {name.split(' ').map((w) => w[0]?.toUpperCase() ?? '').slice(0, 2).join('')}
        </Text>
      </View>
      <View style={styles.partyInfo}>
        <Text style={styles.partyName}>
          {name}
          {isMe ? <Text style={styles.partyMe}> (você)</Text> : null}
        </Text>
        <Text style={styles.partyLabel}>
          {[label, extraLabel].filter(Boolean).join(' · ')}
          {status === 'REJECTED' ? ' · Recusou' : ''}
          {status === 'ACCEPTED' ? ' · Aceitou' : ''}
        </Text>
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function ActionButtons({
  ops,
  fin,
  isCreator,
  isCounterpart,
  isGuaranteed,
  myParticipantStatus,
  actionLoading,
  onAction,
}: {
  ops: string;
  fin: string;
  isCreator: boolean;
  isCounterpart: boolean;
  isGuaranteed: boolean;
  myParticipantStatus?: string;
  actionLoading: string | null;
  onAction: (
    action: 'accept' | 'decline' | 'cancel' | 'complete' | 'confirmCompletion',
    label: string,
    confirmMsg?: string,
  ) => void;
}) {
  if (ops === 'COMPLETED' || ops === 'CANCELLED' || ops === 'EXPIRED') {
    return (
      <View style={styles.terminalMsg}>
        <Ionicons
          name={ops === 'COMPLETED' ? 'checkmark-circle-outline' : 'close-circle-outline'}
          size={20}
          color={ops === 'COMPLETED' ? Colors.accent : Colors.textMuted}
        />
        <Text style={styles.terminalText}>
          {ops === 'COMPLETED' ? 'Combinado concluído.' : 'Combinado encerrado.'}
        </Text>
      </View>
    );
  }

  const buttons: React.ReactNode[] = [];

  // Counterpart + AWAITING_ACCEPTANCE + my status is PENDING
  if (ops === 'AWAITING_ACCEPTANCE' && isCounterpart && myParticipantStatus === 'PENDING') {
    buttons.push(
      <PrimaryButton
        key="accept"
        label="Aceitar combinado"
        onPress={() => onAction('accept', 'Aceite')}
        loading={actionLoading === 'accept'}
        style={{ marginBottom: Spacing.sm }}
      />,
    );
    buttons.push(
      <PrimaryButton
        key="decline"
        label="Recusar"
        variant="danger"
        onPress={() =>
          onAction('decline', 'Recusa', 'Tem certeza que deseja recusar este combinado?')
        }
        loading={actionLoading === 'decline'}
      />,
    );
  }

  // Creator + AWAITING_ACCEPTANCE → cancel
  if (ops === 'AWAITING_ACCEPTANCE' && isCreator) {
    buttons.push(
      <PrimaryButton
        key="cancel-waiting"
        label="Cancelar convite"
        variant="ghost"
        onPress={() =>
          onAction('cancel', 'Cancelamento', 'Deseja cancelar este combinado antes do aceite?')
        }
        loading={actionLoading === 'cancel'}
      />,
    );
  }

  // ACTIVE + SIMPLE → complete + cancel
  if (ops === 'ACTIVE' && !isGuaranteed) {
    buttons.push(
      <PrimaryButton
        key="complete"
        label="Marcar como concluído"
        onPress={() => onAction('complete', 'Conclusão', 'Confirma que o combinado foi cumprido?')}
        loading={actionLoading === 'complete'}
        style={{ marginBottom: Spacing.sm }}
      />,
    );
    buttons.push(
      <PrimaryButton
        key="cancel-active"
        label="Cancelar combinado"
        variant="ghost"
        onPress={() =>
          onAction('cancel', 'Cancelamento', 'Deseja cancelar este combinado?')
        }
        loading={actionLoading === 'cancel'}
      />,
    );
  }

  // ACTIVE + WITH_GUARANTEE + FUNDS_HELD → confirm-completion
  if (
    (ops === 'ACTIVE' || ops === 'AWAITING_CONFIRMATION') &&
    isGuaranteed &&
    fin === 'FUNDS_HELD'
  ) {
    buttons.push(
      <PrimaryButton
        key="confirm"
        label="Confirmar que foi cumprido"
        onPress={() =>
          onAction(
            'confirmCompletion',
            'Confirmação',
            'Confirma que o combinado foi cumprido? O valor será liberado quando ambas as partes confirmarem.',
          )
        }
        loading={actionLoading === 'confirmCompletion'}
        style={{ marginBottom: Spacing.sm }}
      />,
    );
  }

  if (buttons.length === 0) {
    return (
      <View style={styles.terminalMsg}>
        <Ionicons name="time-outline" size={20} color={Colors.textMuted} />
        <Text style={styles.terminalText}>Aguardando ação da outra parte.</Text>
      </View>
    );
  }

  return <View>{buttons}</View>;
}

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg },
  errorScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  errorScreenText: {
    fontSize: FontSize.md,
    color: Colors.danger,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  retryText: { color: Colors.white, fontWeight: FontWeight.semibold },
  backLink: { marginTop: Spacing.md },
  backLinkText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  headerCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  headerBadges: { flexDirection: 'row', marginBottom: Spacing.sm },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryGlow,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  typePillText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    lineHeight: 26,
  },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  generatedSummary: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
  amountCard: {
    backgroundColor: Colors.primaryGlow,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.primary + '33',
  },
  amountLabel: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  amountValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  guaranteeStatus: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    marginTop: 4,
    fontWeight: FontWeight.medium,
  },
  disputeAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.dangerLight,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.danger,
  },
  disputeAlertContent: { flex: 1 },
  disputeAlertTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.danger,
    marginBottom: 2,
  },
  disputeAlertText: { fontSize: FontSize.sm, color: Colors.danger, lineHeight: 18 },
  section: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  partyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyAvatarText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  partyInfo: { flex: 1 },
  partyName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  partyMe: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },
  partyLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  detailLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontWeight: FontWeight.medium,
    flex: 1.5,
    textAlign: 'right',
    lineHeight: 20,
  },
  paymentSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryGlow,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  paymentTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    marginBottom: 4,
  },
  paymentText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    lineHeight: 18,
  },
  actionErrorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: Colors.dangerLight,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  actionErrorText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.danger,
    lineHeight: 18,
  },
  actions: {
    marginBottom: Spacing.md,
  },
  terminalMsg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  terminalText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
});
