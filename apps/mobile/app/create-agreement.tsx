import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StepHeader, ReceiverPreviewCard, PrimaryButton } from '../src/components';
import { receivingKeysService } from '../src/services/receiving-keys.service';
import { agreementsService } from '../src/services/agreements.service';
import { Colors, Spacing, Radii, FontSize, FontWeight, Shadow } from '../src/theme';
import type { ResolveKeyResponse, AgreementDetail } from '../src/types/api';

type AgreementKind = 'receive' | 'pay' | 'custom' | 'guaranteed';

const KIND_CONFIG: Record<AgreementKind, {
  label: string;
  whoQuestion: string;
  whoHint: string;
  amountLabel: string;
  amountRequired: boolean;
  summaryIntro: string;
  guaranteeNote?: string;
}> = {
  receive: {
    label: 'Valor a receber',
    whoQuestion: 'Quem vai te pagar?',
    whoHint: 'Informe a Chave de Recebimento do App da pessoa (ex: @joao)',
    amountLabel: 'Valor a receber (opcional)',
    amountRequired: false,
    summaryIntro: 'receber',
  },
  pay: {
    label: 'Valor a pagar',
    whoQuestion: 'Quem você vai pagar?',
    whoHint: 'Informe a Chave de Recebimento do App da pessoa (ex: @maria)',
    amountLabel: 'Valor a pagar (opcional)',
    amountRequired: false,
    summaryIntro: 'pagar',
  },
  custom: {
    label: 'Acordo personalizado',
    whoQuestion: 'Com quem é o combinado?',
    whoHint: 'Informe a Chave de Recebimento do App da pessoa (ex: @carlos)',
    amountLabel: 'Valor do acordo (opcional)',
    amountRequired: false,
    summaryIntro: 'personalizado',
  },
  guaranteed: {
    label: 'Acordo com garantia',
    whoQuestion: 'Quem vai receber o pagamento?',
    whoHint: 'A pessoa precisa ter configurado um destino de recebimento no app.',
    amountLabel: 'Valor a proteger *',
    amountRequired: true,
    summaryIntro: 'garantia',
    guaranteeNote:
      'O valor ficará protegido até que ambas as partes confirmem que o combinado foi cumprido. Em caso de problema, o valor fica travado até resolução.',
  },
};

const TOTAL_STEPS = 5;
const STEP_LABELS = [
  'Para quem é este combinado?',
  'Sobre o combinado',
  'Valor',
  'Prazo',
  'Revise e confirme',
];

function parseDateInput(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const parts = trimmed.split('/');
  if (parts.length !== 3) return undefined;
  const [d, m, y] = parts.map((p) => parseInt(p, 10));
  if (isNaN(d) || isNaN(m) || isNaN(y)) return undefined;
  if (y < 2024 || y > 2035 || m < 1 || m > 12 || d < 1 || d > 31) return undefined;
  const date = new Date(y, m - 1, d, 23, 59, 59);
  if (isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function formatDateForDisplay(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function quickDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(23, 59, 59, 0);
  return d.toISOString();
}

function buildSummaryText(
  kind: AgreementKind,
  receiver: ResolveKeyResponse | null,
  title: string,
  amountStr: string,
  dueDateIso: string | undefined,
): string {
  const name = receiver?.displayName ?? receiver?.key ?? 'a outra parte';
  const amtNum = parseFloat(amountStr.replace(',', '.'));
  const amtFormatted =
    !isNaN(amtNum) && amtNum > 0
      ? `R$ ${amtNum.toFixed(2).replace('.', ',')}`
      : null;
  const dateStr = dueDateIso ? formatDateForDisplay(dueDateIso) : null;
  const datePart = dateStr ? ` até ${dateStr}` : '';

  switch (kind) {
    case 'receive':
      return `Você está criando um acordo para receber${amtFormatted ? ` ${amtFormatted}` : ''}${datePart ? ` de ${name}${datePart}` : ` de ${name}`}.`;
    case 'pay':
      return `Você está criando um acordo para pagar${amtFormatted ? ` ${amtFormatted}` : ''}${datePart ? ` para ${name}${datePart}` : ` para ${name}`}.`;
    case 'custom':
      return `Você está criando um acordo com ${name}: "${title}".${dateStr ? ` Prazo: ${dateStr}.` : ''}`;
    case 'guaranteed':
      return `${amtFormatted ?? 'O valor'} ficará protegido até que o combinado com ${name} seja concluído.${dateStr ? ` Prazo: ${dateStr}.` : ''}\n\nVocê paga com Pix. O valor fica guardado até ambas as partes confirmarem. Se houver problema, o valor fica travado até resolução.`;
  }
}

export default function CreateAgreementScreen() {
  const params = useLocalSearchParams<{ type: string }>();
  const kind: AgreementKind =
    (['receive', 'pay', 'custom', 'guaranteed'] as AgreementKind[]).includes(
      params.type as AgreementKind,
    )
      ? (params.type as AgreementKind)
      : 'custom';

  const config = KIND_CONFIG[kind];

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdAgreement, setCreatedAgreement] = useState<AgreementDetail | null>(null);

  // Step 0 — who
  const [keyInput, setKeyInput] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolvedReceiver, setResolvedReceiver] = useState<ResolveKeyResponse | null>(null);

  // Step 1 — title + description
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Step 2 — amount
  const [amountStr, setAmountStr] = useState('');

  // Step 3 — due date
  const [dateMode, setDateMode] = useState<'7' | '30' | 'custom'>('7');
  const [customDateInput, setCustomDateInput] = useState('');
  const [dateIso, setDateIso] = useState<string | undefined>(undefined);

  // errors
  const [stepError, setStepError] = useState<string | null>(null);

  function handleBack() {
    setStepError(null);
    if (step === 0) {
      router.back();
    } else {
      setStep((s) => s - 1);
    }
  }

  function handleClose() {
    Alert.alert(
      'Cancelar criação',
      'Tem certeza? As informações preenchidas serão perdidas.',
      [
        { text: 'Continuar aqui', style: 'cancel' },
        {
          text: 'Cancelar',
          style: 'destructive',
          onPress: () => router.back(),
        },
      ],
    );
  }

  const handleResolveKey = useCallback(async () => {
    const raw = keyInput.trim();
    if (!raw) {
      setResolveError('Informe a chave de recebimento.');
      return;
    }
    setResolving(true);
    setResolveError(null);
    setResolvedReceiver(null);
    try {
      const result = await receivingKeysService.resolve(raw);
      setResolvedReceiver(result);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      if (msg.toLowerCase().includes('não encontrada') || msg.toLowerCase().includes('not found')) {
        setResolveError('Chave não encontrada. Verifique e tente novamente.');
      } else if (msg.toLowerCase().includes('indisponível') || msg.toLowerCase().includes('inactive')) {
        setResolveError('Esta chave está indisponível no momento.');
      } else {
        setResolveError('Não foi possível verificar a chave. Tente novamente.');
      }
    } finally {
      setResolving(false);
    }
  }, [keyInput]);

  function validateAndAdvance() {
    setStepError(null);

    if (step === 0) {
      if (!resolvedReceiver) {
        setStepError('Confirme o recebedor antes de continuar.');
        return;
      }
    }

    if (step === 1) {
      if (!title.trim() || title.trim().length < 3) {
        setStepError('O título precisa ter pelo menos 3 caracteres.');
        return;
      }
    }

    if (step === 2) {
      if (config.amountRequired) {
        const val = parseFloat(amountStr.replace(',', '.'));
        if (isNaN(val) || val < 0.01) {
          setStepError('Informe um valor válido (mínimo R$ 0,01).');
          return;
        }
      }
    }

    if (step === 3) {
      if (dateMode === 'custom') {
        const parsed = parseDateInput(customDateInput);
        if (!parsed) {
          setStepError('Data inválida. Use o formato DD/MM/AAAA.');
          return;
        }
        setDateIso(parsed);
      }
      const finalDate = dateMode === 'custom' ? dateIso : quickDate(parseInt(dateMode));
      if (!finalDate) {
        setStepError('Informe o prazo do combinado.');
        return;
      }
    }

    if (step === TOTAL_STEPS - 1) {
      void handleSubmit();
      return;
    }

    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setStepError(null);

    const amtNum = parseFloat(amountStr.replace(',', '.'));
    const amount = !isNaN(amtNum) && amtNum > 0 ? amtNum : undefined;

    const finalDueDate = (() => {
      if (dateMode === '7') return quickDate(7);
      if (dateMode === '30') return quickDate(30);
      return dateIso;
    })();

    try {
      let agreement: AgreementDetail;

      if (kind === 'guaranteed') {
        agreement = await agreementsService.createGuaranteed({
          title: title.trim(),
          counterpartyKey: resolvedReceiver!.key,
          amount: amount ?? 0,
          currency: 'BRL',
          description: description.trim() || undefined,
          dueDate: finalDueDate,
        });
      } else {
        agreement = await agreementsService.createSimple({
          title: title.trim(),
          counterpartyKey: resolvedReceiver!.key,
          amount,
          currency: 'BRL',
          description: description.trim() || undefined,
          dueDate: finalDueDate,
        });
      }

      setCreatedAgreement(agreement);
      setSubmitted(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao criar o acordo.';
      if (msg.includes('destino de recebimento')) {
        setStepError(
          'O recebedor precisa configurar um destino de recebimento no app antes de receber valores protegidos.',
        );
      } else if (msg.includes('consigo mesmo') || msg.includes('yourself')) {
        setStepError('Você não pode criar um acordo consigo mesmo.');
      } else if (msg.includes('chave') && msg.includes('não encontrada')) {
        setStepError('A chave do recebedor não foi encontrada. Volte e verifique.');
      } else {
        setStepError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted && createdAgreement) {
    return <SuccessScreen agreement={createdAgreement} kind={kind} />;
  }

  const isLastStep = step === TOTAL_STEPS - 1;
  const finalDueIso = (() => {
    if (dateMode === '7') return quickDate(7);
    if (dateMode === '30') return quickDate(30);
    return dateIso;
  })();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StepHeader
        currentStep={step}
        totalSteps={TOTAL_STEPS}
        title={STEP_LABELS[step]}
        onBack={handleBack}
        onClose={step > 0 ? handleClose : undefined}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Type badge */}
          <View style={styles.typeBadge}>
            <Ionicons
              name={
                kind === 'receive'
                  ? 'arrow-down-circle'
                  : kind === 'pay'
                  ? 'arrow-up-circle'
                  : kind === 'guaranteed'
                  ? 'shield-checkmark'
                  : 'document-text'
              }
              size={16}
              color={Colors.primary}
            />
            <Text style={styles.typeBadgeText}>{config.label}</Text>
          </View>

          {/* Step content */}
          {step === 0 && (
            <StepWho
              kind={kind}
              config={config}
              keyInput={keyInput}
              onKeyChange={(v) => {
                setKeyInput(v);
                setResolvedReceiver(null);
                setResolveError(null);
              }}
              resolving={resolving}
              resolveError={resolveError}
              resolvedReceiver={resolvedReceiver}
              onResolve={handleResolveKey}
            />
          )}

          {step === 1 && (
            <StepTitle
              title={title}
              onTitleChange={setTitle}
              description={description}
              onDescriptionChange={setDescription}
            />
          )}

          {step === 2 && (
            <StepAmount
              kind={kind}
              config={config}
              amountStr={amountStr}
              onAmountChange={setAmountStr}
            />
          )}

          {step === 3 && (
            <StepDate
              dateMode={dateMode}
              onDateModeChange={(mode: '7' | '30' | 'custom') => {
                setDateMode(mode);
                if (mode !== 'custom') setCustomDateInput('');
              }}
              customDateInput={customDateInput}
              onCustomDateChange={setCustomDateInput}
            />
          )}

          {step === 4 && (
            <StepSummary
              kind={kind}
              config={config}
              receiver={resolvedReceiver}
              title={title}
              description={description}
              amountStr={amountStr}
              dueDateIso={finalDueIso}
            />
          )}

          {stepError && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={Colors.danger} />
              <Text style={styles.errorText}>{stepError}</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step === 2 && !config.amountRequired && (
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => {
                setAmountStr('');
                setStep((s) => s + 1);
              }}
            >
              <Text style={styles.skipText}>Pular (sem valor)</Text>
            </TouchableOpacity>
          )}
          <PrimaryButton
            label={isLastStep ? 'Criar combinado' : 'Continuar'}
            onPress={validateAndAdvance}
            loading={submitting}
            disabled={step === 0 && !resolvedReceiver}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Step Components ──────────────────────────────────────────────

function StepWho({
  kind,
  config,
  keyInput,
  onKeyChange,
  resolving,
  resolveError,
  resolvedReceiver,
  onResolve,
}: {
  kind: AgreementKind;
  config: (typeof KIND_CONFIG)[AgreementKind];
  keyInput: string;
  onKeyChange: (v: string) => void;
  resolving: boolean;
  resolveError: string | null;
  resolvedReceiver: ResolveKeyResponse | null;
  onResolve: () => void;
}) {
  return (
    <View>
      <Text style={styles.label}>{config.whoQuestion}</Text>
      <Text style={styles.hint}>{config.whoHint}</Text>

      <View style={styles.keyInputRow}>
        <TextInput
          style={[styles.input, styles.keyInput]}
          placeholder="@handle"
          value={keyInput}
          onChangeText={onKeyChange}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={onResolve}
        />
        <TouchableOpacity
          style={[styles.resolveBtn, resolving && styles.resolveBtnDisabled]}
          onPress={onResolve}
          disabled={resolving || !keyInput.trim()}
        >
          <Text style={styles.resolveBtnText}>
            {resolving ? 'Buscando...' : 'Confirmar'}
          </Text>
        </TouchableOpacity>
      </View>

      {resolveError && (
        <View style={styles.resolveError}>
          <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} />
          <Text style={styles.resolveErrorText}>{resolveError}</Text>
        </View>
      )}

      {resolvedReceiver && (
        <View style={styles.receiverWrap}>
          <ReceiverPreviewCard receiver={resolvedReceiver} />
        </View>
      )}

      {kind === 'guaranteed' && (
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.info} />
          <Text style={styles.infoText}>
            O recebedor precisa ter um destino de recebimento cadastrado para acordos com valor protegido.
          </Text>
        </View>
      )}
    </View>
  );
}

function StepTitle({
  title,
  onTitleChange,
  description,
  onDescriptionChange,
}: {
  title: string;
  onTitleChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
}) {
  return (
    <View>
      <Text style={styles.label}>Título do combinado *</Text>
      <Text style={styles.hint}>Seja claro e objetivo. Até 100 caracteres.</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Pagamento pelo serviço de design"
        value={title}
        onChangeText={onTitleChange}
        maxLength={100}
        returnKeyType="next"
      />
      <Text style={styles.charCount}>{title.length}/100</Text>

      <Text style={[styles.label, { marginTop: Spacing.lg }]}>Descrição (opcional)</Text>
      <Text style={styles.hint}>Adicione detalhes, condições ou observações.</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Ex: O logo deve ser entregue em PNG e SVG até 20/06."
        value={description}
        onChangeText={onDescriptionChange}
        multiline
        numberOfLines={4}
        maxLength={2000}
        textAlignVertical="top"
      />
    </View>
  );
}

function StepAmount({
  kind,
  config,
  amountStr,
  onAmountChange,
}: {
  kind: AgreementKind;
  config: (typeof KIND_CONFIG)[AgreementKind];
  amountStr: string;
  onAmountChange: (v: string) => void;
}) {
  return (
    <View>
      <Text style={styles.label}>{config.amountLabel}</Text>
      {config.amountRequired ? (
        <Text style={styles.hint}>Este valor ficará protegido até o acordo ser cumprido.</Text>
      ) : (
        <Text style={styles.hint}>Registre o valor para acompanhamento. Sem bloqueio financeiro.</Text>
      )}

      <View style={styles.amountRow}>
        <View style={styles.currencyTag}>
          <Text style={styles.currencyText}>R$</Text>
        </View>
        <TextInput
          style={[styles.input, styles.amountInput]}
          placeholder="0,00"
          value={amountStr}
          onChangeText={onAmountChange}
          keyboardType="decimal-pad"
          returnKeyType="done"
        />
      </View>

      {kind === 'guaranteed' && (
        <View style={styles.guaranteeNote}>
          <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primary} />
          <Text style={styles.guaranteeNoteText}>
            Você paga com Pix. O valor fica guardado até o combinado ser concluído por ambas as partes.
          </Text>
        </View>
      )}
    </View>
  );
}

const DATE_OPTIONS = [
  { label: '7 dias', mode: '7' as const },
  { label: '30 dias', mode: '30' as const },
  { label: 'Personalizado', mode: 'custom' as const },
];

function StepDate({
  dateMode,
  onDateModeChange,
  customDateInput,
  onCustomDateChange,
}: {
  dateMode: '7' | '30' | 'custom';
  onDateModeChange: (mode: '7' | '30' | 'custom') => void;
  customDateInput: string;
  onCustomDateChange: (v: string) => void;
}) {
  return (
    <View>
      <Text style={styles.label}>Prazo do combinado *</Text>
      <Text style={styles.hint}>Todo combinado precisa ter prazo. Escolha uma opção ou defina uma data personalizada.</Text>

      <View style={styles.dateChips}>
        {DATE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.mode}
            style={[styles.dateChip, dateMode === opt.mode && styles.dateChipActive]}
            onPress={() => onDateModeChange(opt.mode)}
          >
            <Text
              style={[styles.dateChipText, dateMode === opt.mode && styles.dateChipTextActive]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {dateMode === 'custom' && (
        <View style={{ marginTop: Spacing.md }}>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/AAAA"
            value={customDateInput}
            onChangeText={onCustomDateChange}
            keyboardType="numeric"
            maxLength={10}
          />
        </View>
      )}

      {dateMode !== 'custom' && (
        <View style={styles.datePrev}>
          <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.datePrevText}>
            {formatDateForDisplay(quickDate(parseInt(dateMode)))}
          </Text>
        </View>
      )}
    </View>
  );
}

function StepSummary({
  kind,
  config,
  receiver,
  title,
  description,
  amountStr,
  dueDateIso,
}: {
  kind: AgreementKind;
  config: (typeof KIND_CONFIG)[AgreementKind];
  receiver: ResolveKeyResponse | null;
  title: string;
  description: string;
  amountStr: string;
  dueDateIso: string | undefined;
}) {
  const summaryText = buildSummaryText(kind, receiver, title, amountStr, dueDateIso);

  return (
    <View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>{summaryText}</Text>
      </View>

      <View style={styles.summaryDetails}>
        <SummaryRow icon="document-text-outline" label="Título" value={title} />
        {receiver && (
          <SummaryRow
            icon="person-outline"
            label="Recebedor"
            value={`${receiver.displayName ?? receiver.key} (${receiver.key})`}
          />
        )}
        {amountStr && parseFloat(amountStr.replace(',', '.')) > 0 && (
          <SummaryRow
            icon="cash-outline"
            label="Valor"
            value={`R$ ${parseFloat(amountStr.replace(',', '.')).toFixed(2).replace('.', ',')}`}
          />
        )}
        {dueDateIso && (
          <SummaryRow
            icon="calendar-outline"
            label="Prazo"
            value={formatDateForDisplay(dueDateIso)}
          />
        )}
        {description && (
          <SummaryRow icon="chatbubble-outline" label="Observação" value={description} />
        )}
        <SummaryRow
          icon={kind === 'guaranteed' ? 'shield-checkmark-outline' : 'document-outline'}
          label="Tipo"
          value={config.label}
        />
      </View>

      {kind === 'guaranteed' && (
        <View style={styles.guaranteeDisclaimer}>
          <Ionicons name="shield-outline" size={18} color={Colors.primary} />
          <Text style={styles.guaranteeDisclaimerText}>
            Após criar, a outra parte precisa aceitar. Depois, você inicia o depósito Pix do valor protegido.
          </Text>
        </View>
      )}
    </View>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <Ionicons name={icon} size={16} color={Colors.textSecondary} style={styles.summaryRowIcon} />
      <View style={styles.summaryRowContent}>
        <Text style={styles.summaryRowLabel}>{label}</Text>
        <Text style={styles.summaryRowValue}>{value}</Text>
      </View>
    </View>
  );
}

function SuccessScreen({
  agreement,
  kind,
}: {
  agreement: AgreementDetail;
  kind: AgreementKind;
}) {
  const config = KIND_CONFIG[kind];

  return (
    <SafeAreaView style={styles.successSafe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.successContent} showsVerticalScrollIndicator={false}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={64} color={Colors.accent} />
        </View>
        <Text style={styles.successTitle}>Combinado criado!</Text>
        <Text style={styles.successSubtitle}>
          {kind === 'guaranteed'
            ? 'A outra parte precisa aceitar. Depois, você poderá iniciar o depósito do valor protegido.'
            : 'O combinado foi registrado e a outra parte foi notificada para aceitar.'}
        </Text>

        <View style={styles.successCard}>
          <Text style={styles.successCardTitle}>{agreement.title}</Text>
          <View style={styles.successCardBadge}>
            <Text style={styles.successCardBadgeText}>{config.label}</Text>
          </View>
          {agreement.amount && (
            <Text style={styles.successCardAmount}>
              R$ {Number(agreement.amount).toFixed(2).replace('.', ',')}
            </Text>
          )}
          {agreement.dueDate && (
            <Text style={styles.successCardDate}>
              Prazo: {formatDateForDisplay(agreement.dueDate)}
            </Text>
          )}
        </View>

        <View style={styles.successActions}>
          <PrimaryButton
            label="Ver o acordo"
            onPress={() => {
              router.replace(`/agreement/${agreement.id}` as never);
            }}
          />
          <PrimaryButton
            label="Voltar para início"
            variant="secondary"
            onPress={() => {
              router.replace('/(app)/home');
            }}
            style={{ marginTop: Spacing.sm }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgBase },
  flex: { flex: 1 },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryGlow,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: Spacing.lg,
  },
  typeBadgeText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  hint: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  input: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    ...Shadow.sm,
  },
  keyInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  keyInput: {
    flex: 1,
  },
  resolveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    ...Shadow.sm,
  },
  resolveBtnDisabled: {
    opacity: 0.5,
  },
  resolveBtnText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  resolveError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  resolveErrorText: {
    fontSize: FontSize.sm,
    color: Colors.danger,
    flex: 1,
  },
  receiverWrap: {
    marginTop: Spacing.md,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.infoLight,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.info,
    lineHeight: 20,
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  textArea: {
    height: 100,
    paddingTop: Spacing.sm,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  currencyTag: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    ...Shadow.sm,
  },
  currencyText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  amountInput: {
    flex: 1,
  },
  guaranteeNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryGlow,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  guaranteeNoteText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.primary,
    lineHeight: 20,
  },
  dateChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dateChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    backgroundColor: Colors.bgCard,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  dateChipActive: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primary,
  },
  dateChipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  dateChipTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  datePrev: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  datePrevText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  summaryCard: {
    backgroundColor: Colors.primaryGlow,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary + '33',
    marginBottom: Spacing.lg,
  },
  summaryText: {
    fontSize: FontSize.md,
    color: Colors.primary,
    lineHeight: 24,
    fontWeight: FontWeight.medium,
  },
  summaryDetails: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    ...Shadow.sm,
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  summaryRowIcon: {
    marginTop: 2,
  },
  summaryRowContent: { flex: 1 },
  summaryRowLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryRowValue: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    marginTop: 2,
    lineHeight: 20,
  },
  guaranteeDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryGlow,
    borderRadius: Radii.md,
    padding: Spacing.md,
  },
  guaranteeDisclaimerText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.primary,
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.dangerLight,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.danger,
    lineHeight: 20,
  },
  footer: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  skipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  // Success screen
  successSafe: { flex: 1, backgroundColor: Colors.bgBase },
  successContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
  },
  successIcon: {
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  successCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    width: '100%',
    marginBottom: Spacing.xl,
    ...Shadow.md,
    alignItems: 'flex-start',
  },
  successCardTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  successCardBadge: {
    backgroundColor: Colors.primaryGlow,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    marginBottom: Spacing.sm,
  },
  successCardBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  successCardAmount: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  successCardDate: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  successActions: {
    width: '100%',
  },
});
