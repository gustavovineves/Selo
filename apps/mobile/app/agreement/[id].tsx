import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Share,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { StatusBadge, LoadingState, PrimaryButton } from '../../src/components';
import { agreementsService } from '../../src/services/agreements.service';
import { paymentsService } from '../../src/services/payments.service';
import { disputesService } from '../../src/services/disputes.service';
import { Colors, Spacing, Radii, FontSize, FontWeight, Shadow } from '../../src/theme';
import type {
  AgreementDetail,
  AgreementParticipant,
  PaymentIntentResponse,
  DisputeDetail,
} from '../../src/types/api';

// ── Utilities ──────────────────────────────────────────────────────

async function getCurrentUserId(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync('accessToken');
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1])) as Record<string, unknown>;
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function formatCurrency(amount: number | string | null | undefined, currency = 'BRL'): string {
  if (amount === null || amount === undefined) return '—';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '—';
  const symbol = currency === 'BRL' ? 'R$' : currency;
  return `${symbol} ${num.toFixed(2).replace('.', ',')}`;
}

function mapApiError(e: unknown, ctx: 'pix' | 'simulate' | 'dispute' | 'evidence' | 'action'): string {
  const raw = e instanceof Error ? e.message : String(e);
  const msg = raw.toLowerCase();

  if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('expirada'))
    return 'Sessão expirada. Faça login novamente.';
  if (msg.includes('403') || msg.includes('permissão') || msg.includes('acesso'))
    return 'Você não tem permissão para esta ação.';
  if (msg.includes('failed to fetch') || msg.includes('network'))
    return 'Sem conexão com o servidor. Verifique sua internet.';

  switch (ctx) {
    case 'pix':
      if (msg.includes('409') || msg.includes('pagamento em andamento'))
        return 'Já existe um pagamento ativo para este acordo. Aguarde o vencimento ou use o código anterior.';
      if (msg.includes('ativo') || msg.includes('aceito'))
        return 'O acordo precisa estar ativo e aceito para iniciar o pagamento.';
      if (msg.includes('aguarda') || msg.includes('awaiting_payment'))
        return 'O acordo já está aguardando pagamento.';
      return 'Erro ao gerar Pix. Tente novamente.';
    case 'simulate':
      if (msg.includes('409') || msg.includes('confirmado'))
        return 'Este pagamento já foi confirmado.';
      return 'Erro ao simular confirmação. Tente novamente.';
    case 'dispute':
      if (msg.includes('409') || msg.includes('disputa'))
        return 'Já existe uma contestação aberta para este acordo.';
      if (msg.includes('funds_held') || msg.includes('protegido'))
        return 'O valor precisa estar protegido para abrir uma contestação.';
      if (msg.includes('not_allowed') || msg.includes('not allowed'))
        return 'Este acordo não permite contestação.';
      return 'Erro ao abrir contestação. Tente novamente.';
    case 'evidence':
      if (msg.includes('closed') || msg.includes('encerrada'))
        return 'A contestação já foi encerrada e não aceita novas evidências.';
      return 'Erro ao enviar evidência. Tente novamente.';
    case 'action':
      if (msg.includes('409') && msg.includes('confirmou'))
        return 'Você já confirmou a conclusão deste acordo.';
      if (msg.includes('409') && msg.includes('disputa'))
        return 'Existe uma contestação em aberto. Aguarde a resolução para confirmar.';
      if (msg.includes('aceite') || msg.includes('acceptance'))
        return 'Este acordo não está aguardando aceite.';
      return raw || 'Erro desconhecido. Tente novamente.';
  }
}

function getDestinationSnapshot(data: unknown): { type: string; maskedValue: string } | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (typeof d.maskedValue !== 'string') return null;
  return { type: String(d.type ?? ''), maskedValue: d.maskedValue };
}

function getSenderName(senderId: string, senderType: string, participants: AgreementParticipant[]): string {
  if (senderType === 'SYSTEM' || senderType === 'ADMIN') return 'Administrador Selo';
  const p = participants.find((x) => x.userId === senderId);
  return p?.user?.profile?.displayName ?? p?.user?.profile?.fullName ?? 'Participante';
}

const DISPUTE_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberta — aguardando análise',
  UNDER_REVIEW: 'Em análise',
  AWAITING_EVIDENCE: 'Aguardando evidências',
  RESOLVED_FAVOR_CREATOR: 'Resolvida — reembolso ao pagador',
  RESOLVED_FAVOR_COUNTERPART: 'Resolvida — valor liberado ao recebedor',
  WITHDRAWN: 'Retirada',
  CLOSED: 'Encerrada',
};

const MSG_TYPE_LABELS: Record<string, string> = {
  TEXT: 'Observação',
  EVIDENCE: 'Evidência',
  SYSTEM_NOTE: 'Registro do sistema',
  ADMIN_NOTE: 'Nota administrativa',
  RESOLUTION: 'Decisão administrativa',
};

// ── Main Screen ────────────────────────────────────────────────────

type SimpleAction = 'accept' | 'decline' | 'cancel' | 'complete' | 'confirmCompletion';

export default function AgreementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [agreement, setAgreement] = useState<AgreementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [paymentIntent, setPaymentIntent] = useState<PaymentIntentResponse | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  const [disputeDetail, setDisputeDetail] = useState<DisputeDetail | null>(null);

  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);

  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [evidenceText, setEvidenceText] = useState('');
  const [evidenceSubmitting, setEvidenceSubmitting] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const [ag, userId] = await Promise.all([
        agreementsService.getById(id),
        getCurrentUserId(),
      ]);
      setAgreement(ag);
      setCurrentUserId(userId);

      if (ag.dispute[0]?.id) {
        try {
          const dd = await disputesService.getById(ag.dispute[0].id);
          setDisputeDetail(dd);
        } catch {
          setDisputeDetail(null);
        }
      } else {
        setDisputeDetail(null);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('403') || msg.toLowerCase().includes('acesso'))
        setError('Você não tem acesso a este acordo.');
      else if (msg.includes('404') || msg.toLowerCase().includes('não encontrado'))
        setError('Acordo não encontrado.');
      else
        setError('Não foi possível carregar o acordo. Tente novamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { void loadData(); }, [loadData]);

  function handleRefresh() {
    setRefreshing(true);
    void loadData();
  }

  async function handleAction(action: SimpleAction, label: string, confirmMsg?: string) {
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

  async function doAction(action: SimpleAction, label: string) {
    if (!id) return;
    setActionLoading(action);
    setActionError(null);
    try {
      switch (action) {
        case 'accept': await agreementsService.accept(id); break;
        case 'decline': await agreementsService.decline(id); break;
        case 'cancel': await agreementsService.cancel(id); break;
        case 'complete': await agreementsService.complete(id); break;
        case 'confirmCompletion': await agreementsService.confirmCompletion(id); break;
      }
      await loadData();
      Alert.alert('Feito!', `${label} realizado com sucesso.`);
    } catch (e: unknown) {
      setActionError(mapApiError(e, 'action'));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleGeneratePix() {
    if (!id) return;
    setPixLoading(true);
    setPixError(null);
    try {
      const pi = await agreementsService.createPaymentIntent(id);
      setPaymentIntent(pi);
    } catch (e: unknown) {
      setPixError(mapApiError(e, 'pix'));
    } finally {
      setPixLoading(false);
    }
  }

  async function handleSimulatePix() {
    if (!paymentIntent) return;
    setSimulating(true);
    setPixError(null);
    try {
      await paymentsService.simulateConfirmation(paymentIntent.id);
      setPaymentIntent(null);
      await loadData();
      Alert.alert('Pagamento confirmado!', 'O valor está protegido e o acordo pode ser concluído.');
    } catch (e: unknown) {
      setPixError(mapApiError(e, 'simulate'));
    } finally {
      setSimulating(false);
    }
  }

  async function handleSharePixCode() {
    if (!paymentIntent?.pixCharge?.qrCode) return;
    try {
      await Share.share({
        message: paymentIntent.pixCharge.qrCode,
        title: 'Código Pix — Selo',
      });
    } catch {
      // User dismissed share sheet
    }
  }

  async function handleOpenDispute() {
    if (!id) return;
    if (!disputeReason.trim()) {
      setDisputeError('Informe o motivo da contestação.');
      return;
    }
    if (!disputeDescription.trim()) {
      setDisputeError('Informe a descrição objetiva da contestação.');
      return;
    }
    setDisputeSubmitting(true);
    setDisputeError(null);
    try {
      await agreementsService.openDispute(id, {
        reason: disputeReason.trim(),
        description: disputeDescription.trim(),
      });
      setShowDisputeForm(false);
      setDisputeReason('');
      setDisputeDescription('');
      await loadData();
      Alert.alert('Contestação registrada', 'Sua contestação foi aberta. O valor fica travado até a decisão administrativa.');
    } catch (e: unknown) {
      setDisputeError(mapApiError(e, 'dispute'));
    } finally {
      setDisputeSubmitting(false);
    }
  }

  async function handleAddEvidence() {
    if (!disputeDetail) return;
    if (!evidenceText.trim()) {
      setEvidenceError('Informe a informação para análise.');
      return;
    }
    setEvidenceSubmitting(true);
    setEvidenceError(null);
    try {
      await disputesService.addEvidence(disputeDetail.id, {
        content: evidenceText.trim(),
        type: 'EVIDENCE',
      });
      setShowEvidenceForm(false);
      setEvidenceText('');
      await loadData();
      Alert.alert('Evidência registrada', 'Sua informação foi adicionada ao histórico formal da contestação.');
    } catch (e: unknown) {
      setEvidenceError(mapApiError(e, 'evidence'));
    } finally {
      setEvidenceSubmitting(false);
    }
  }

  // ── Loading / Error states ────────────────────────────────────────

  if (loading) {
    return <LoadingState fullscreen message="Carregando combinado..." />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.errorScreen}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.danger} />
          <Text style={styles.errorScreenText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => { setLoading(true); void loadData(); }}
          >
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

  // ── Derived state ─────────────────────────────────────────────────

  const isGuaranteed = agreement.type === 'WITH_GUARANTEE';
  const isCreator = agreement.createdById === currentUserId;
  const isCounterpart = agreement.participants.some(
    (p) => p.userId === currentUserId && p.role === 'COUNTERPART',
  );
  const myParticipant = agreement.participants.find((p) => p.userId === currentUserId);
  const counterpart = agreement.participants.find((p) => p.role === 'COUNTERPART');
  const creator = agreement.participants.find((p) => p.role === 'CREATOR');

  const ops = agreement.operationalStatus;
  const fin = agreement.financialStatus;
  const guarantee = agreement.financialGuarantee[0];
  const dispute = agreement.dispute[0];

  const hasActiveDispute = Boolean(dispute) && fin === 'DISPUTED';
  const hasResolvedDispute =
    Boolean(dispute) &&
    (dispute.status.startsWith('RESOLVED') || dispute.status === 'CLOSED');
  const isDisputeOpen = disputeDetail?.status === 'OPEN';
  const destinationSnapshot = getDestinationSnapshot(agreement.receiverDestinationSnapshot);

  function getParticipantName(p: typeof counterpart): string {
    if (!p) return '—';
    return p.user?.profile?.displayName ?? p.user?.profile?.fullName ?? 'Usuário';
  }

  const showPixPayment =
    isGuaranteed && ops === 'ACTIVE' && fin === 'AWAITING_PAYMENT' && isCreator && !paymentIntent;
  const showPixGenerated =
    isGuaranteed && ops === 'ACTIVE' && fin === 'AWAITING_PAYMENT' && Boolean(paymentIntent);
  const showValueProtected =
    isGuaranteed && (fin === 'FUNDS_HELD' || fin === 'DISPUTED');

  // ── Render ────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          (showDisputeForm || showEvidenceForm) && { paddingBottom: 320 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Header card ── */}
        <View style={styles.headerCard}>
          <View style={styles.headerBadges}>
            <View style={[styles.typePill, isGuaranteed && styles.typePillGuaranteed]}>
              <Ionicons
                name={isGuaranteed ? 'shield-checkmark-outline' : 'document-text-outline'}
                size={13}
                color={isGuaranteed ? Colors.accent : Colors.primary}
              />
              <Text style={[styles.typePillText, isGuaranteed && styles.typePillTextGuaranteed]}>
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
          {agreement.generatedSummary ? (
            <Text style={styles.generatedSummary}>{agreement.generatedSummary}</Text>
          ) : null}
        </View>

        {/* ── 2. Amount card ── */}
        {agreement.amount ? (
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>
              {isGuaranteed ? 'Valor do acordo com garantia' : 'Valor do acordo'}
            </Text>
            <Text style={styles.amountValue}>
              {formatCurrency(agreement.amount, agreement.currency)}
            </Text>
            {isGuaranteed && guarantee ? (
              <Text style={styles.amountSub}>
                Garantia: {GUARANTEE_STATUS[guarantee.status] ?? guarantee.status}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* ── 3. Value protected card ── */}
        {showValueProtected ? (
          <View style={[styles.protectedCard, hasActiveDispute && styles.protectedCardDisputed]}>
            <View style={styles.protectedRow}>
              <Ionicons
                name={hasActiveDispute ? 'lock-closed' : 'shield-checkmark'}
                size={22}
                color={hasActiveDispute ? Colors.warning : Colors.accent}
              />
              <View style={styles.protectedText}>
                <Text style={[styles.protectedTitle, hasActiveDispute && styles.protectedTitleDisputed]}>
                  {hasActiveDispute ? 'Valor travado em contestação' : 'Valor protegido'}
                </Text>
                <Text style={styles.protectedValue}>
                  {formatCurrency(agreement.amount, agreement.currency)}
                </Text>
                <Text style={styles.protectedSubtext}>
                  {hasActiveDispute
                    ? 'O valor fica travado até a decisão administrativa.'
                    : 'O valor já foi confirmado e está guardado até a conclusão do acordo.'}
                </Text>
                {destinationSnapshot ? (
                  <Text style={styles.protectedDest}>
                    Destino do recebedor: {destinationSnapshot.maskedValue}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        {/* ── 4. Pix payment card (awaiting payment, creator, no intent yet) ── */}
        {showPixPayment ? (
          <View style={styles.pixCard}>
            <View style={styles.pixCardHeader}>
              <Ionicons name="qr-code-outline" size={20} color={Colors.primary} />
              <Text style={styles.pixCardTitle}>Pagar com Pix</Text>
            </View>
            <Text style={styles.pixCardText}>
              Este acordo tem valor protegido.
            </Text>
            <Text style={styles.pixCardText}>
              Você paga com Pix e o valor fica guardado até a conclusão do acordo.
            </Text>
            <Text style={styles.pixCardNote}>
              Pix simulado no ambiente de desenvolvimento.
            </Text>
            {pixError ? (
              <Text style={styles.pixError}>{pixError}</Text>
            ) : null}
            <PrimaryButton
              label="Gerar Pix"
              onPress={() => void handleGeneratePix()}
              loading={pixLoading}
              style={{ marginTop: Spacing.md }}
            />
          </View>
        ) : null}

        {/* ── 5. Pix generated card (payment intent created) ── */}
        {showPixGenerated && paymentIntent ? (
          <View style={styles.pixGeneratedCard}>
            <View style={styles.pixGeneratedHeader}>
              <View style={styles.pixGeneratedStatus}>
                <View style={styles.pixDot} />
                <Text style={styles.pixGeneratedStatusText}>Aguardando pagamento</Text>
              </View>
              <Text style={styles.pixGeneratedTitle}>Pix gerado</Text>
            </View>
            {paymentIntent.pixCharge?.qrCode ? (
              <>
                <Text style={styles.pixCodeLabel}>Código Pix:</Text>
                <Text style={styles.pixCode} numberOfLines={3} selectable>
                  {paymentIntent.pixCharge.qrCode}
                </Text>
                <PrimaryButton
                  label="Compartilhar código Pix"
                  variant="secondary"
                  onPress={() => void handleSharePixCode()}
                  style={{ marginTop: Spacing.sm }}
                />
              </>
            ) : null}
            <View style={styles.pixSimDivider}>
              <View style={styles.pixSimDividerLine} />
              <Text style={styles.pixSimDividerText}>Apenas para simulação</Text>
              <View style={styles.pixSimDividerLine} />
            </View>
            {pixError ? (
              <Text style={styles.pixError}>{pixError}</Text>
            ) : null}
            <PrimaryButton
              label="Simular pagamento confirmado"
              variant="ghost"
              onPress={() => void handleSimulatePix()}
              loading={simulating}
            />
          </View>
        ) : null}

        {/* ── 6. Action error ── */}
        {actionError ? (
          <View style={styles.actionErrorBox}>
            <Ionicons name="alert-circle" size={16} color={Colors.danger} />
            <Text style={styles.actionErrorText}>{actionError}</Text>
          </View>
        ) : null}

        {/* ── 7. Action buttons ── */}
        <View style={styles.actions}>
          <ActionButtons
            ops={ops}
            fin={fin}
            isCreator={isCreator}
            isCounterpart={isCounterpart}
            isGuaranteed={isGuaranteed}
            myParticipantStatus={myParticipant?.status}
            hasActiveDispute={hasActiveDispute}
            hasResolvedDispute={hasResolvedDispute}
            actionLoading={actionLoading}
            onAction={handleAction}
            onOpenDisputeForm={() => {
              setShowDisputeForm(true);
              setDisputeError(null);
            }}
          />
        </View>

        {/* ── 8. Open dispute form (inline) ── */}
        {showDisputeForm ? (
          <View style={styles.disputeForm}>
            <View style={styles.disputeFormHeader}>
              <Ionicons name="warning-outline" size={18} color={Colors.warning} />
              <Text style={styles.disputeFormTitle}>Abrir contestação</Text>
            </View>
            <Text style={styles.disputeFormWarning}>
              Quando uma contestação é aberta, o valor fica travado até resolução administrativa.
            </Text>
            <Text style={styles.disputeFormHint}>
              Use a contestação se o combinado não foi cumprido ou se há algum problema com o acordo.
            </Text>

            <Text style={styles.fieldLabel}>Motivo *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: Serviço não entregue conforme combinado"
              placeholderTextColor={Colors.textMuted}
              value={disputeReason}
              onChangeText={setDisputeReason}
              maxLength={200}
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>Descrição objetiva *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Descreva objetivamente o que aconteceu..."
              placeholderTextColor={Colors.textMuted}
              value={disputeDescription}
              onChangeText={setDisputeDescription}
              maxLength={1000}
              multiline
              numberOfLines={Platform.OS === 'ios' ? undefined : 4}
              textAlignVertical="top"
            />

            {disputeError ? (
              <Text style={styles.formError}>{disputeError}</Text>
            ) : null}

            <PrimaryButton
              label="Enviar contestação"
              variant="danger"
              onPress={() => void handleOpenDispute()}
              loading={disputeSubmitting}
              style={{ marginTop: Spacing.md }}
            />
            <TouchableOpacity
              style={styles.cancelFormBtn}
              onPress={() => {
                setShowDisputeForm(false);
                setDisputeError(null);
              }}
            >
              <Text style={styles.cancelFormText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── 9. Participants ── */}
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

        {/* ── 10. Details ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalhes</Text>
          <DetailRow label="Prazo" value={formatDate(agreement.dueDate)} />
          <DetailRow label="Criado em" value={formatDate(agreement.createdAt)} />
          {agreement.description ? (
            <DetailRow label="Observação" value={agreement.description} />
          ) : null}
          {isGuaranteed && fin !== 'NOT_APPLICABLE' ? (
            <DetailRow label="Status financeiro" value={FIN_STATUS_LABELS[fin] ?? fin} />
          ) : null}
          {agreement.completedAt ? (
            <DetailRow label="Concluído em" value={formatDate(agreement.completedAt)} />
          ) : null}
          {agreement.canceledAt ? (
            <DetailRow label="Cancelado em" value={formatDate(agreement.canceledAt)} />
          ) : null}
          {agreement.disputedAt ? (
            <DetailRow label="Contestado em" value={formatDate(agreement.disputedAt)} />
          ) : null}
        </View>

        {/* ── 11. Resolution card (when dispute resolved) ── */}
        {hasResolvedDispute && disputeDetail ? (
          <ResolutionCard dispute={disputeDetail} financialStatus={fin} />
        ) : null}

        {/* ── 12. Dispute detail section (formal history) ── */}
        {dispute && disputeDetail ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contestação</Text>

            <View style={styles.disputeInfoRow}>
              <Text style={styles.disputeInfoLabel}>Status</Text>
              <Text style={styles.disputeInfoValue}>
                {DISPUTE_STATUS_LABELS[disputeDetail.status] ?? disputeDetail.status}
              </Text>
            </View>
            <View style={styles.disputeInfoRow}>
              <Text style={styles.disputeInfoLabel}>Aberta por</Text>
              <Text style={styles.disputeInfoValue}>
                {getSenderName(disputeDetail.openedById, 'USER', agreement.participants)}
                {disputeDetail.openedById === currentUserId ? ' (você)' : ''}
                {' · '}
                {formatDate(disputeDetail.createdAt)}
              </Text>
            </View>
            {disputeDetail.reason ? (
              <View style={styles.disputeInfoRow}>
                <Text style={styles.disputeInfoLabel}>Motivo</Text>
                <Text style={styles.disputeInfoValue}>{disputeDetail.reason}</Text>
              </View>
            ) : null}
            {disputeDetail.description ? (
              <View style={[styles.disputeInfoRow, styles.disputeInfoRowLast]}>
                <Text style={styles.disputeInfoLabel}>Descrição</Text>
                <Text style={styles.disputeInfoValue}>{disputeDetail.description}</Text>
              </View>
            ) : null}

            {disputeDetail.messages.length > 0 ? (
              <>
                <Text style={styles.evidenceHistoryTitle}>Histórico formal da contestação</Text>
                {disputeDetail.messages.map((msg) => (
                  <EvidenceItem
                    key={msg.id}
                    content={msg.content}
                    type={msg.type}
                    senderName={getSenderName(msg.senderId, msg.senderType, agreement.participants)}
                    isMe={msg.senderId === currentUserId}
                    isSystem={msg.senderType === 'SYSTEM' || msg.senderType === 'ADMIN'}
                    isResolution={msg.type === 'RESOLUTION'}
                    date={formatDate(msg.createdAt)}
                  />
                ))}
              </>
            ) : null}
          </View>
        ) : dispute && !disputeDetail ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contestação</Text>
            <View style={styles.disputeInfoRow}>
              <Text style={styles.disputeInfoLabel}>Motivo</Text>
              <Text style={styles.disputeInfoValue}>{dispute.reason ?? '—'}</Text>
            </View>
            <View style={[styles.disputeInfoRow, styles.disputeInfoRowLast]}>
              <Text style={styles.disputeInfoLabel}>Status</Text>
              <Text style={styles.disputeInfoValue}>
                {DISPUTE_STATUS_LABELS[dispute.status] ?? dispute.status}
              </Text>
            </View>
          </View>
        ) : null}

        {/* ── 13. Add evidence form (when dispute is open) ── */}
        {isDisputeOpen ? (
          <View style={styles.evidenceSection}>
            {!showEvidenceForm ? (
              <TouchableOpacity
                style={styles.addEvidenceBtn}
                onPress={() => {
                  setShowEvidenceForm(true);
                  setEvidenceError(null);
                }}
              >
                <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                <Text style={styles.addEvidenceBtnText}>Adicionar evidência</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.evidenceForm}>
                <Text style={styles.evidenceFormTitle}>Adicionar evidência</Text>
                <Text style={styles.evidenceFormHint}>
                  Essa informação será adicionada ao histórico formal da contestação para análise.
                </Text>
                <Text style={styles.fieldLabel}>Informação para análise *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Descreva objetivamente sua evidência..."
                  placeholderTextColor={Colors.textMuted}
                  value={evidenceText}
                  onChangeText={setEvidenceText}
                  maxLength={2000}
                  multiline
                  numberOfLines={Platform.OS === 'ios' ? undefined : 4}
                  textAlignVertical="top"
                />
                {evidenceError ? (
                  <Text style={styles.formError}>{evidenceError}</Text>
                ) : null}
                <PrimaryButton
                  label="Enviar evidência"
                  onPress={() => void handleAddEvidence()}
                  loading={evidenceSubmitting}
                  style={{ marginTop: Spacing.md }}
                />
                <TouchableOpacity
                  style={styles.cancelFormBtn}
                  onPress={() => {
                    setShowEvidenceForm(false);
                    setEvidenceError(null);
                  }}
                >
                  <Text style={styles.cancelFormText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Financial / Guarantee status labels ───────────────────────────

const FIN_STATUS_LABELS: Record<string, string> = {
  NOT_APPLICABLE: 'Sem garantia',
  AWAITING_PAYMENT: 'Aguardando pagamento',
  FUNDS_HELD: 'Valor protegido',
  AWAITING_PAYOUT: 'Aguardando repasse',
  PAID_OUT: 'Pagamento liberado',
  AWAITING_REFUND: 'Aguardando reembolso',
  REFUNDED: 'Reembolsado',
  DISPUTED: 'Em contestação',
};

const GUARANTEE_STATUS: Record<string, string> = {
  AWAITING_PAYMENT: 'Aguardando pagamento',
  LOCKED: 'Protegido',
  AWAITING_PAYOUT: 'Aguardando repasse',
  PAID_OUT: 'Liberado',
  AWAITING_REFUND: 'Aguardando reembolso',
  REFUNDED: 'Reembolsado',
  FROZEN_DISPUTE: 'Travado em contestação',
};

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

function EvidenceItem({
  content,
  type,
  senderName,
  isMe,
  isSystem,
  isResolution,
  date,
}: {
  content: string;
  type: string;
  senderName: string;
  isMe: boolean;
  isSystem: boolean;
  isResolution: boolean;
  date: string;
}) {
  return (
    <View style={[styles.evidenceItem, isResolution && styles.evidenceItemResolution]}>
      {isResolution ? (
        <View style={styles.evidenceResolutionBadge}>
          <Ionicons name="checkmark-circle" size={14} color={Colors.accent} />
          <Text style={styles.evidenceResolutionBadgeText}>Decisão administrativa</Text>
        </View>
      ) : (
        <View style={styles.evidenceMeta}>
          <Text style={styles.evidenceType}>{MSG_TYPE_LABELS[type] ?? type}</Text>
          <Text style={styles.evidenceSender}>
            {isSystem ? '🏛 Administrador Selo' : `${senderName}${isMe ? ' (você)' : ''}`}
          </Text>
        </View>
      )}
      <Text style={[styles.evidenceContent, isResolution && styles.evidenceContentResolution]}>
        {content}
      </Text>
      <Text style={styles.evidenceDate}>{date}</Text>
    </View>
  );
}

function ResolutionCard({
  dispute,
  financialStatus,
}: {
  dispute: DisputeDetail;
  financialStatus: string;
}) {
  const isRelease = dispute.status === 'RESOLVED_FAVOR_COUNTERPART';
  return (
    <View style={[styles.resolutionCard, isRelease ? styles.resolutionCardRelease : styles.resolutionCardRefund]}>
      <View style={styles.resolutionHeader}>
        <Ionicons
          name={isRelease ? 'checkmark-circle' : 'refresh-circle'}
          size={22}
          color={isRelease ? Colors.accent : Colors.info}
        />
        <Text style={styles.resolutionTitle}>Contestação resolvida</Text>
      </View>
      <Text style={styles.resolutionOutcome}>
        {isRelease
          ? 'O valor foi liberado ao recebedor.'
          : 'O valor foi reembolsado ao pagador.'}
      </Text>
      {dispute.resolution ? (
        <Text style={styles.resolutionJustification}>{dispute.resolution}</Text>
      ) : null}
      {dispute.resolvedAt ? (
        <Text style={styles.resolutionDate}>
          Decidido em: {dispute.resolvedAt ? new Date(dispute.resolvedAt).toLocaleDateString('pt-BR') : '—'}
        </Text>
      ) : null}
      <Text style={styles.resolutionFinalStatus}>
        Status financeiro: {FIN_STATUS_LABELS[financialStatus] ?? financialStatus}
      </Text>
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
  hasActiveDispute,
  hasResolvedDispute,
  actionLoading,
  onAction,
  onOpenDisputeForm,
}: {
  ops: string;
  fin: string;
  isCreator: boolean;
  isCounterpart: boolean;
  isGuaranteed: boolean;
  myParticipantStatus?: string;
  hasActiveDispute: boolean;
  hasResolvedDispute: boolean;
  actionLoading: string | null;
  onAction: (action: SimpleAction, label: string, confirmMsg?: string) => void;
  onOpenDisputeForm: () => void;
}) {
  // Terminal operational states
  if (ops === 'COMPLETED' || ops === 'CANCELLED' || ops === 'EXPIRED') {
    const isCompleted = ops === 'COMPLETED';
    const subText = isCompleted
      ? fin === 'PAID_OUT' ? 'Pagamento liberado ao recebedor.' : undefined
      : fin === 'REFUNDED' ? 'Valor reembolsado ao pagador.' : undefined;
    return (
      <View style={styles.terminalMsg}>
        <Ionicons
          name={isCompleted ? 'checkmark-circle-outline' : 'close-circle-outline'}
          size={22}
          color={isCompleted ? Colors.accent : Colors.textMuted}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.terminalText}>
            {isCompleted ? 'Combinado concluído.' : 'Combinado encerrado.'}
          </Text>
          {subText ? (
            <Text style={styles.terminalSubText}>{subText}</Text>
          ) : null}
        </View>
      </View>
    );
  }

  // Active dispute — no user actions until resolved
  if (hasActiveDispute) {
    return (
      <View style={styles.disputeStatusMsg}>
        <Ionicons name="lock-closed-outline" size={20} color={Colors.warning} />
        <View style={{ flex: 1 }}>
          <Text style={styles.disputeStatusText}>Em contestação</Text>
          <Text style={styles.disputeStatusSub}>Valor travado até decisão administrativa.</Text>
        </View>
      </View>
    );
  }

  // Resolved dispute — informational only
  if (hasResolvedDispute) {
    return (
      <View style={styles.terminalMsg}>
        <Ionicons name="information-circle-outline" size={20} color={Colors.info} />
        <Text style={styles.terminalText}>Contestação resolvida. Veja os detalhes abaixo.</Text>
      </View>
    );
  }

  const buttons: React.ReactNode[] = [];

  // AWAITING_ACCEPTANCE: counterpart actions
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
        onPress={() => onAction('decline', 'Recusa', 'Tem certeza que deseja recusar este combinado?')}
        loading={actionLoading === 'decline'}
      />,
    );
  }

  // AWAITING_ACCEPTANCE: creator can cancel
  if (ops === 'AWAITING_ACCEPTANCE' && isCreator) {
    buttons.push(
      <PrimaryButton
        key="cancel-waiting"
        label="Cancelar convite"
        variant="ghost"
        onPress={() => onAction('cancel', 'Cancelamento', 'Deseja cancelar este combinado antes do aceite?')}
        loading={actionLoading === 'cancel'}
      />,
    );
  }

  // ACTIVE + SIMPLE: complete + cancel
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
        onPress={() => onAction('cancel', 'Cancelamento', 'Deseja cancelar este combinado?')}
        loading={actionLoading === 'cancel'}
      />,
    );
  }

  // ACTIVE + GUARANTEED + AWAITING_PAYMENT: counterpart waits
  if (ops === 'ACTIVE' && isGuaranteed && fin === 'AWAITING_PAYMENT' && !isCreator) {
    buttons.push(
      <View key="wait-payment" style={styles.terminalMsg}>
        <Ionicons name="time-outline" size={20} color={Colors.textMuted} />
        <Text style={styles.terminalText}>Aguardando pagamento do criador.</Text>
      </View>,
    );
  }

  // ACTIVE or AWAITING_CONFIRMATION + GUARANTEED + FUNDS_HELD: confirm + contestar
  if (
    (ops === 'ACTIVE' || ops === 'AWAITING_CONFIRMATION') &&
    isGuaranteed &&
    fin === 'FUNDS_HELD'
  ) {
    const isFirstConfirmation = ops === 'ACTIVE';
    const confirmMsg = isFirstConfirmation
      ? 'Confirma que o combinado foi cumprido?\n\nDepois da sua confirmação, a outra parte ainda precisará confirmar para o valor ser liberado.'
      : 'Ao confirmar, o valor será liberado ao recebedor. Confirma que o combinado foi cumprido?';

    buttons.push(
      <PrimaryButton
        key="confirm"
        label="Confirmar conclusão"
        onPress={() => onAction('confirmCompletion', 'Confirmação', confirmMsg)}
        loading={actionLoading === 'confirmCompletion'}
        style={{ marginBottom: Spacing.sm }}
      />,
    );
    buttons.push(
      <PrimaryButton
        key="dispute"
        label="Contestar"
        variant="danger"
        onPress={onOpenDisputeForm}
        loading={false}
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
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },

  errorScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  errorScreenText: { fontSize: FontSize.md, color: Colors.danger, textAlign: 'center', marginTop: Spacing.md, lineHeight: 22 },
  retryBtn: { marginTop: Spacing.lg, backgroundColor: Colors.primary, borderRadius: Radii.full, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm },
  retryText: { color: Colors.white, fontWeight: FontWeight.semibold },
  backLink: { marginTop: Spacing.md },
  backLinkText: { color: Colors.textSecondary, fontSize: FontSize.sm },

  headerCard: { backgroundColor: Colors.bgCard, borderRadius: Radii.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.sm },
  headerBadges: { flexDirection: 'row', marginBottom: Spacing.sm },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primaryGlow, borderRadius: Radii.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  typePillGuaranteed: { backgroundColor: Colors.accentLight },
  typePillText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold },
  typePillTextGuaranteed: { color: Colors.accent },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.sm, lineHeight: 26 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  generatedSummary: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, fontStyle: 'italic', marginTop: Spacing.xs },

  amountCard: { backgroundColor: Colors.primaryGlow, borderRadius: Radii.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1.5, borderColor: Colors.primary + '33' },
  amountLabel: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.xs },
  amountValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.primary },
  amountSub: { fontSize: FontSize.sm, color: Colors.primary, marginTop: 4, fontWeight: FontWeight.medium },

  protectedCard: { backgroundColor: Colors.accentLight, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1.5, borderColor: Colors.accent + '66' },
  protectedCardDisputed: { backgroundColor: Colors.warningLight, borderColor: Colors.warning + '66' },
  protectedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  protectedText: { flex: 1 },
  protectedTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.accent, marginBottom: 2 },
  protectedTitleDisputed: { color: Colors.warning },
  protectedValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 4 },
  protectedSubtext: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18 },
  protectedDest: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4 },

  pixCard: { backgroundColor: Colors.bgCard, borderRadius: Radii.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1.5, borderColor: Colors.primary + '44', ...Shadow.sm },
  pixCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  pixCardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.primary },
  pixCardText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: 4 },
  pixCardNote: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.xs, fontStyle: 'italic' },
  pixError: { fontSize: FontSize.sm, color: Colors.danger, marginTop: Spacing.sm },

  pixGeneratedCard: { backgroundColor: Colors.bgCard, borderRadius: Radii.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1.5, borderColor: Colors.accent + '55', ...Shadow.sm },
  pixGeneratedHeader: { marginBottom: Spacing.md },
  pixGeneratedStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  pixDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.warning },
  pixGeneratedStatusText: { fontSize: FontSize.xs, color: Colors.warning, fontWeight: FontWeight.semibold },
  pixGeneratedTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  pixCodeLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  pixCode: { fontSize: FontSize.xs, color: Colors.textSecondary, backgroundColor: Colors.bgBase, borderRadius: Radii.sm, padding: Spacing.sm, lineHeight: 18 },
  pixSimDivider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginVertical: Spacing.md },
  pixSimDividerLine: { flex: 1, height: 1, backgroundColor: Colors.borderLight },
  pixSimDividerText: { fontSize: FontSize.xs, color: Colors.textMuted, fontStyle: 'italic' },

  actionErrorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, backgroundColor: Colors.dangerLight, borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.md },
  actionErrorText: { flex: 1, fontSize: FontSize.sm, color: Colors.danger, lineHeight: 18 },

  actions: { marginBottom: Spacing.md },
  terminalMsg: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radii.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  terminalText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium, flex: 1 },
  terminalSubText: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  disputeStatusMsg: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.warningLight, borderRadius: Radii.md, padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.warning + '66' },
  disputeStatusText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.warning },
  disputeStatusSub: { fontSize: FontSize.xs, color: Colors.warning, marginTop: 2 },

  disputeForm: { backgroundColor: Colors.bgCard, borderRadius: Radii.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1.5, borderColor: Colors.danger + '55', ...Shadow.sm },
  disputeFormHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  disputeFormTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.danger },
  disputeFormWarning: { fontSize: FontSize.sm, color: Colors.warning, lineHeight: 20, marginBottom: Spacing.sm, fontWeight: FontWeight.medium },
  disputeFormHint: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.md },

  fieldLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: Spacing.sm },
  textInput: { backgroundColor: Colors.bgBase, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.md, color: Colors.textPrimary, minHeight: 46 },
  textArea: { minHeight: 100, paddingTop: Spacing.sm },
  formError: { fontSize: FontSize.sm, color: Colors.danger, marginTop: Spacing.sm },
  cancelFormBtn: { alignItems: 'center', paddingVertical: Spacing.md },
  cancelFormText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },

  section: { backgroundColor: Colors.bgCard, borderRadius: Radii.lg, overflow: 'hidden', marginBottom: Spacing.md, ...Shadow.sm },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.xs },

  partyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  partyAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryGlow, alignItems: 'center', justifyContent: 'center' },
  partyAvatarText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  partyInfo: { flex: 1 },
  partyName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  partyMe: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },
  partyLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  detailLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
  detailValue: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium, flex: 1.5, textAlign: 'right', lineHeight: 20 },

  disputeInfoRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderLight, gap: Spacing.sm },
  disputeInfoRowLast: {},
  disputeInfoLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, width: 90, flexShrink: 0 },
  disputeInfoValue: { fontSize: FontSize.sm, color: Colors.textPrimary, flex: 1, lineHeight: 20 },
  evidenceHistoryTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.xs },

  evidenceItem: { marginHorizontal: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.bgBase, borderRadius: Radii.md, padding: Spacing.sm },
  evidenceItemResolution: { backgroundColor: Colors.accentLight, borderWidth: 1, borderColor: Colors.accent + '55' },
  evidenceMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  evidenceType: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.primary, backgroundColor: Colors.primaryGlow, borderRadius: Radii.full, paddingHorizontal: 8, paddingVertical: 2 },
  evidenceSender: { fontSize: FontSize.xs, color: Colors.textMuted },
  evidenceResolutionBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  evidenceResolutionBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.accent, textTransform: 'uppercase', letterSpacing: 0.3 },
  evidenceContent: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 20 },
  evidenceContentResolution: { fontWeight: FontWeight.medium },
  evidenceDate: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4, textAlign: 'right' },

  evidenceSection: { marginBottom: Spacing.md },
  addEvidenceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radii.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '44' },
  addEvidenceBtnText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
  evidenceForm: { backgroundColor: Colors.bgCard, borderRadius: Radii.lg, padding: Spacing.lg, borderWidth: 1.5, borderColor: Colors.primary + '44', ...Shadow.sm },
  evidenceFormTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.xs },
  evidenceFormHint: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.sm },

  resolutionCard: { borderRadius: Radii.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1.5 },
  resolutionCardRelease: { backgroundColor: Colors.accentLight, borderColor: Colors.accent + '66' },
  resolutionCardRefund: { backgroundColor: Colors.infoLight, borderColor: Colors.info + '66' },
  resolutionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  resolutionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  resolutionOutcome: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary, lineHeight: 22, marginBottom: Spacing.xs },
  resolutionJustification: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.xs },
  resolutionDate: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 2 },
  resolutionFinalStatus: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium },
});
