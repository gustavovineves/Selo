import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Share,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useProfile } from '../../src/hooks/useProfile';
import { authService } from '../../src/services/auth.service';
import { receivingKeysService } from '../../src/services/receiving-keys.service';
import { receivingDestinationsService } from '../../src/services/receiving-destinations.service';
import { LoadingState, EmptyState } from '../../src/components';
import { Colors, Spacing, Radii, FontSize, FontWeight, Shadow } from '../../src/theme';
import type { TrustScoreLevel, ReceivingDestinationResponse } from '../../src/types/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const DEST_TYPES = [
  { value: 'PIX_CPF', label: 'CPF' },
  { value: 'PIX_EMAIL', label: 'E-mail' },
  { value: 'PIX_PHONE', label: 'Telefone' },
  { value: 'PIX_RANDOM', label: 'Aleatória' },
];

const DEST_TYPE_PLACEHOLDER: Record<string, string> = {
  PIX_CPF: 'Ex: 123.456.789-00 (simulado)',
  PIX_EMAIL: 'Ex: email@exemplo.com (simulado)',
  PIX_PHONE: 'Ex: +5511999999999 (simulado)',
  PIX_RANDOM: 'Qualquer texto (simulado)',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDestType(type: string): string {
  const map: Record<string, string> = {
    PIX_CPF: 'CPF',
    PIX_CNPJ: 'CNPJ',
    PIX_EMAIL: 'E-mail',
    PIX_PHONE: 'Telefone',
    PIX_RANDOM: 'Aleatória',
  };
  return map[type] ?? type;
}

function mapError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
    return '__401__';
  }
  if (msg.includes('já em uso') || msg.includes('already in use')) {
    return 'Este handle já está em uso. Escolha outro.';
  }
  if (msg.includes('reservado')) {
    return 'Este handle é reservado e não pode ser usado.';
  }
  if (msg.includes('ativa') && msg.includes('chave')) {
    return 'Você já tem uma chave ativa. Exclua-a antes de criar uma nova.';
  }
  if (msg.includes('3 caracteres') || msg.includes('mínimo 3')) {
    return 'O handle deve ter no mínimo 3 caracteres.';
  }
  if (msg.includes('30 caracteres') || msg.includes('máximo 30')) {
    return 'O handle deve ter no máximo 30 caracteres.';
  }
  if (msg.includes('letras, números') || msg.includes('formato')) {
    return 'Handle inválido. Use apenas letras, números, ponto, underline ou hífen.';
  }
  if (msg.includes('pendentes') || msg.includes('pending') || msg.includes('bloqueada')) {
    return 'Não é possível excluir: há acordos ou valores pendentes.';
  }
  if (msg.includes('vinculado') || msg.includes('acordos')) {
    return 'Este destino não pode ser excluído porque ainda está vinculado a acordos ou valores pendentes.';
  }
  if (msg.includes('500') || msg.toLowerCase().includes('internal')) {
    return 'Serviço temporariamente indisponível. Tente novamente.';
  }
  return msg || 'Erro inesperado. Tente novamente.';
}

function handleRedirect401() {
  Alert.alert('Sessão expirada', 'Faça login novamente.', [
    { text: 'OK', onPress: () => router.replace('/(auth)/login') },
  ]);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { profile, loading, error, refresh } = useProfile();

  // ── Receiving Key state ───────────────────────────────────────────────────
  const [showCreateKeyForm, setShowCreateKeyForm] = useState(false);
  const [newHandle, setNewHandle] = useState('');
  const [handleAvailability, setHandleAvailability] = useState<boolean | null>(null);
  const [keyLoading, setKeyLoading] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keyDeleting, setKeyDeleting] = useState(false);

  // ── Destination state ─────────────────────────────────────────────────────
  const [showAddDestForm, setShowAddDestForm] = useState(false);
  const [destType, setDestType] = useState('PIX_CPF');
  const [destPixKey, setDestPixKey] = useState('');
  const [destLabel, setDestLabel] = useState('');
  const [destIsDefault, setDestIsDefault] = useState(false);
  const [destCreating, setDestCreating] = useState(false);
  const [destError, setDestError] = useState<string | null>(null);

  // ── Edit destination state ────────────────────────────────────────────────
  const [editingDestId, setEditingDestId] = useState<string | null>(null);
  const [editDestLabel, setEditDestLabel] = useState('');
  const [editDestIsDefault, setEditDestIsDefault] = useState(false);
  const [destUpdating, setDestUpdating] = useState(false);
  const [destUpdateError, setDestUpdateError] = useState<string | null>(null);

  // ── Delete destination state ──────────────────────────────────────────────
  const [deletingDestId, setDeletingDestId] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Handlers: Auth ────────────────────────────────────────────────────────

  async function handleLogout() {
    Alert.alert('Sair da conta', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await authService.logout();
          } catch {
            // silencioso — limpa token de qualquer forma
          }
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  // ── Handlers: Receiving Key ───────────────────────────────────────────────

  async function handleShareKey(key: string) {
    try {
      await Share.share({
        message: `Minha chave Selo: @${key}\nBaixe o app Selo e crie combinados comigo!`,
      });
    } catch {
      // silencioso
    }
  }

  function handleCopyKey(key: string) {
    Alert.alert('Minha Chave de Recebimento', `@${key}`, [
      { text: 'Fechar' },
    ]);
  }

  async function handleCheckHandle() {
    const normalized = newHandle.trim().toLowerCase().replace(/^@/, '');
    if (!normalized || normalized.length < 3) {
      setHandleAvailability(null);
      return;
    }
    try {
      const result = await receivingKeysService.check(normalized);
      setHandleAvailability(result.available);
    } catch {
      setHandleAvailability(null);
    }
  }

  async function handleCreateKey() {
    const normalized = newHandle.trim().toLowerCase().replace(/^@/, '');
    if (!normalized || normalized.length < 3) {
      setKeyError('Handle deve ter no mínimo 3 caracteres.');
      return;
    }
    setKeyLoading(true);
    setKeyError(null);
    try {
      await receivingKeysService.create(normalized);
      setShowCreateKeyForm(false);
      setNewHandle('');
      setHandleAvailability(null);
      await refresh();
    } catch (e) {
      const msg = mapError(e);
      if (msg === '__401__') { handleRedirect401(); return; }
      setKeyError(msg);
    } finally {
      setKeyLoading(false);
    }
  }

  async function handleDeleteKey() {
    Alert.alert(
      'Excluir chave',
      'Tem certeza que deseja excluir sua Chave de Recebimento? Pessoas não poderão criar novos acordos com você usando esta chave.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setKeyDeleting(true);
            setKeyError(null);
            try {
              await receivingKeysService.deleteMe();
              await refresh();
            } catch (e) {
              const msg = mapError(e);
              if (msg === '__401__') { handleRedirect401(); return; }
              setKeyError(msg);
            } finally {
              setKeyDeleting(false);
            }
          },
        },
      ],
    );
  }

  // ── Handlers: Destinations ────────────────────────────────────────────────

  function openDestEditForm(dest: ReceivingDestinationResponse) {
    setEditingDestId(dest.id);
    setEditDestLabel(dest.label ?? '');
    setEditDestIsDefault(dest.isDefault);
    setDestUpdateError(null);
  }

  function cancelDestEdit() {
    setEditingDestId(null);
    setEditDestLabel('');
    setEditDestIsDefault(false);
    setDestUpdateError(null);
  }

  async function handleUpdateDest(destId: string) {
    setDestUpdating(true);
    setDestUpdateError(null);
    try {
      await receivingDestinationsService.update(destId, {
        label: editDestLabel.trim() || undefined,
        isDefault: editDestIsDefault,
      });
      setEditingDestId(null);
      await refresh();
    } catch (e) {
      const msg = mapError(e);
      if (msg === '__401__') { handleRedirect401(); return; }
      setDestUpdateError(msg);
    } finally {
      setDestUpdating(false);
    }
  }

  async function handleDeleteDest(destId: string, maskedValue: string) {
    Alert.alert(
      'Excluir destino',
      `Deseja excluir o destino "${maskedValue}"?\n\nSe houver acordos ou valores pendentes vinculados a este destino, a exclusão será bloqueada.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setDeletingDestId(destId);
            try {
              await receivingDestinationsService.remove(destId);
              await refresh();
            } catch (e) {
              const msg = mapError(e);
              if (msg === '__401__') { handleRedirect401(); return; }
              Alert.alert(
                'Não foi possível excluir',
                msg.includes('pendentes') || msg.includes('vinculado')
                  ? 'Este destino não pode ser excluído porque ainda está vinculado a acordos ou valores pendentes.'
                  : msg,
              );
            } finally {
              setDeletingDestId(null);
            }
          },
        },
      ],
    );
  }

  async function handleSetDefault(destId: string) {
    try {
      await receivingDestinationsService.update(destId, { isDefault: true });
      await refresh();
    } catch (e) {
      const msg = mapError(e);
      if (msg === '__401__') { handleRedirect401(); return; }
      Alert.alert('Erro', msg);
    }
  }

  function openAddDestForm() {
    setShowAddDestForm(true);
    setDestType('PIX_CPF');
    setDestPixKey('');
    setDestLabel('');
    setDestIsDefault(false);
    setDestError(null);
  }

  async function handleCreateDest() {
    if (!destPixKey.trim()) {
      setDestError('Informe o valor da chave.');
      return;
    }
    setDestCreating(true);
    setDestError(null);
    try {
      await receivingDestinationsService.create({
        type: destType,
        pixKey: destPixKey.trim(),
        label: destLabel.trim() || undefined,
        isDefault: destIsDefault,
      });
      setShowAddDestForm(false);
      setDestPixKey('');
      setDestLabel('');
      await refresh();
    } catch (e) {
      const msg = mapError(e);
      if (msg === '__401__') { handleRedirect401(); return; }
      setDestError(msg);
    } finally {
      setDestCreating(false);
    }
  }

  // ── Render guards ─────────────────────────────────────────────────────────

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

  const fullName = me?.profile?.fullName ?? me?.email ?? 'Usuário';
  const displayName = me?.profile?.displayName ?? fullName;
  const initials = getInitials(displayName);
  const city = me?.profile?.city;
  const trustScore = me?.trustScore;

  // ── Render ────────────────────────────────────────────────────────────────

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
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Avatar Header ───────────────────────────────────────────── */}
      <View style={styles.avatarSection}>
        <TouchableOpacity
          style={styles.editProfileBtn}
          onPress={() => router.push('/edit-profile')}
        >
          <Ionicons name="pencil-outline" size={14} color={Colors.textOnDarkMuted} />
          <Text style={styles.editProfileText}>Editar</Text>
        </TouchableOpacity>

        <View style={styles.avatar}>
          <Text style={styles.initials}>{initials}</Text>
        </View>

        <Text style={styles.name}>{displayName}</Text>
        {displayName !== fullName && (
          <Text style={styles.fullNameSub}>{fullName}</Text>
        )}
        <Text style={styles.email}>{me?.email}</Text>
        {city && <Text style={styles.city}>{city}</Text>}

        {trustScore && (
          <View
            style={[styles.scoreBadge, { borderColor: LEVEL_COLOR[trustScore.level] + '44' }]}
          >
            <View style={[styles.scoreDot, { backgroundColor: LEVEL_COLOR[trustScore.level] }]} />
            <Text style={[styles.scoreValue, { color: LEVEL_COLOR[trustScore.level] }]}>
              {trustScore.score}
            </Text>
            <Text style={styles.scoreLabel}>
              {LEVEL_LABEL[trustScore.level]} · Score de confiança
            </Text>
          </View>
        )}
      </View>

      {/* ── Score Card ─────────────────────────────────────────────── */}
      {trustScore && (
        <TouchableOpacity
          style={[styles.card, styles.scoreCard]}
          onPress={() => router.push({ pathname: '/trust-score', params: { score: String(trustScore.score), level: trustScore.level } } as any)}
          activeOpacity={0.8}
        >
          <View style={styles.scoreCardHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color={LEVEL_COLOR[trustScore.level]} />
            <Text style={styles.cardTitle}>Score de confiança</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} style={{ marginLeft: 'auto' }} />
          </View>
          <Text style={[styles.scoreNumber, { color: LEVEL_COLOR[trustScore.level] }]}>
            {trustScore.score}
          </Text>
          <Text style={styles.scoreLevelLabel}>{LEVEL_LABEL[trustScore.level]}</Text>
          <Text style={styles.scoreExplain}>
            Toque para entender como seu score é calculado.
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Receiving Key Section ───────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Minha Chave de Recebimento</Text>
        <Text style={styles.sectionSubtitle}>
          Use essa chave para outras pessoas criarem acordos com você.
        </Text>

        {keyError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{keyError}</Text>
          </View>
        )}

        {receivingKey ? (
          <>
            <View style={styles.keyDisplay}>
              <View style={styles.keyIconRow}>
                <Ionicons name="at-outline" size={20} color={Colors.primary} />
                <Text style={styles.keyHandle}>{receivingKey.key}</Text>
              </View>
              <View style={styles.keyStatusRow}>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{receivingKey.status === 'ACTIVE' ? 'Ativa' : receivingKey.status}</Text>
                </View>
              </View>
            </View>

            <View style={styles.keyActions}>
              <TouchableOpacity
                style={styles.keyBtn}
                onPress={() => handleCopyKey(receivingKey.normalizedKey ?? receivingKey.key.replace('@', ''))}
              >
                <Ionicons name="copy-outline" size={15} color={Colors.primary} />
                <Text style={styles.keyBtnText}>Copiar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.keyBtn}
                onPress={() => handleShareKey(receivingKey.normalizedKey ?? receivingKey.key.replace('@', ''))}
              >
                <Ionicons name="share-outline" size={15} color={Colors.primary} />
                <Text style={styles.keyBtnText}>Compartilhar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.keyBtn, styles.keyBtnDanger]}
                onPress={handleDeleteKey}
                disabled={keyDeleting}
              >
                {keyDeleting ? (
                  <ActivityIndicator size={12} color={Colors.danger} />
                ) : (
                  <Ionicons name="trash-outline" size={15} color={Colors.danger} />
                )}
                <Text style={[styles.keyBtnText, styles.keyBtnTextDanger]}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : showCreateKeyForm ? (
          <View style={styles.createKeyForm}>
            <Text style={styles.createKeyHint}>
              Escolha um handle único. Use letras, números, ponto, underline ou hífen.
            </Text>
            <View style={styles.handleInputRow}>
              <Text style={styles.atPrefix}>@</Text>
              <TextInput
                style={styles.handleInput}
                value={newHandle}
                onChangeText={(t) => {
                  setNewHandle(t.toLowerCase().replace(/[^a-z0-9._-]/g, ''));
                  setHandleAvailability(null);
                }}
                onEndEditing={handleCheckHandle}
                placeholder="seu.handle"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                editable={!keyLoading}
              />
              <TouchableOpacity
                style={styles.checkBtn}
                onPress={handleCheckHandle}
                disabled={keyLoading}
              >
                <Text style={styles.checkBtnText}>Verificar</Text>
              </TouchableOpacity>
            </View>

            {handleAvailability === true && (
              <Text style={styles.availableText}>✓ Handle disponível</Text>
            )}
            {handleAvailability === false && (
              <Text style={styles.unavailableText}>✗ Handle indisponível</Text>
            )}

            <View style={styles.createKeyActions}>
              <TouchableOpacity
                style={[styles.createBtn, (!newHandle || newHandle.length < 3 || keyLoading) && styles.createBtnDisabled]}
                onPress={handleCreateKey}
                disabled={!newHandle || newHandle.length < 3 || keyLoading}
              >
                {keyLoading ? (
                  <ActivityIndicator size={14} color={Colors.white} />
                ) : (
                  <Text style={styles.createBtnText}>Criar minha chave</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowCreateKeyForm(false);
                  setNewHandle('');
                  setHandleAvailability(null);
                  setKeyError(null);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyKeyState}>
            <Ionicons name="key-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyKeyTitle}>Nenhuma chave configurada</Text>
            <Text style={styles.emptyKeyHint}>
              Crie sua Chave de Recebimento para que outras pessoas possam criar acordos com você.
            </Text>
            <TouchableOpacity
              style={styles.createKeyTrigger}
              onPress={() => {
                setShowCreateKeyForm(true);
                setKeyError(null);
              }}
            >
              <Ionicons name="add-outline" size={16} color={Colors.white} />
              <Text style={styles.createKeyTriggerText}>Criar minha chave</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Destinations Section ────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Destino de Recebimento</Text>
        <Text style={styles.sectionSubtitle}>
          Para receber valores protegidos, você precisa cadastrar um destino de recebimento.
        </Text>

        <View style={styles.devNote}>
          <Ionicons name="flask-outline" size={12} color={Colors.warning} />
          <Text style={styles.devNoteText}>Ambiente de desenvolvimento: destino simulado.</Text>
        </View>

        {/* Destination list */}
        {destinations.length > 0 ? (
          destinations.map((dest) => (
            <View key={dest.id} style={styles.destItem}>
              <View style={styles.destRow}>
                <View style={styles.destInfo}>
                  <View style={styles.destTypeBadge}>
                    <Text style={styles.destTypeText}>{formatDestType(dest.type)}</Text>
                  </View>
                  <View style={styles.destDetails}>
                    <Text style={styles.destMasked}>{dest.maskedValue}</Text>
                    {dest.label ? (
                      <Text style={styles.destLabel}>{dest.label}</Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.destRight}>
                  {dest.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Padrão</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Dest actions */}
              {editingDestId !== dest.id && (
                <View style={styles.destActions}>
                  {!dest.isDefault && (
                    <TouchableOpacity
                      style={styles.destActionBtn}
                      onPress={() => handleSetDefault(dest.id)}
                    >
                      <Text style={styles.destActionText}>Definir padrão</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.destActionBtn}
                    onPress={() => openDestEditForm(dest)}
                  >
                    <Text style={styles.destActionText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.destActionBtn, styles.destActionDanger]}
                    onPress={() => handleDeleteDest(dest.id, dest.maskedValue)}
                    disabled={deletingDestId === dest.id}
                  >
                    {deletingDestId === dest.id ? (
                      <ActivityIndicator size={12} color={Colors.danger} />
                    ) : (
                      <Text style={[styles.destActionText, styles.destActionDangerText]}>Excluir</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Inline edit form */}
              {editingDestId === dest.id && (
                <View style={styles.editDestForm}>
                  <Text style={styles.editDestFormTitle}>Editar destino</Text>
                  <Text style={styles.editDestFormHint}>
                    Para trocar a chave Pix, cadastre um novo destino e defina como padrão.
                  </Text>
                  <TextInput
                    style={styles.editInput}
                    value={editDestLabel}
                    onChangeText={setEditDestLabel}
                    placeholder="Apelido (ex: Conta principal)"
                    placeholderTextColor={Colors.textMuted}
                    editable={!destUpdating}
                  />
                  <View style={styles.editDestToggleRow}>
                    <Text style={styles.editDestToggleLabel}>Definir como padrão</Text>
                    <Switch
                      value={editDestIsDefault}
                      onValueChange={setEditDestIsDefault}
                      trackColor={{ false: Colors.border, true: Colors.primary + '88' }}
                      thumbColor={editDestIsDefault ? Colors.primary : Colors.textMuted}
                      disabled={destUpdating}
                    />
                  </View>
                  {destUpdateError && (
                    <Text style={styles.destFormError}>{destUpdateError}</Text>
                  )}
                  <View style={styles.editDestActions}>
                    <TouchableOpacity
                      style={[styles.saveBtn, destUpdating && styles.saveBtnDisabled]}
                      onPress={() => handleUpdateDest(dest.id)}
                      disabled={destUpdating}
                    >
                      {destUpdating ? (
                        <ActivityIndicator size={14} color={Colors.white} />
                      ) : (
                        <Text style={styles.saveBtnText}>Salvar</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelBtn} onPress={cancelDestEdit}>
                      <Text style={styles.cancelBtnText}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyDestState}>
            <Ionicons name="wallet-outline" size={28} color={Colors.textMuted} />
            <Text style={styles.emptyDestTitle}>Nenhum destino cadastrado</Text>
            <Text style={styles.emptyDestHint}>
              Cadastre um destino para receber valores em acordos com garantia.
            </Text>
          </View>
        )}

        {/* Add destination button / form */}
        {!showAddDestForm ? (
          <TouchableOpacity style={styles.addDestBtn} onPress={openAddDestForm}>
            <Ionicons name="add-outline" size={16} color={Colors.primary} />
            <Text style={styles.addDestBtnText}>Adicionar destino</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.addDestForm}>
            <Text style={styles.addDestFormTitle}>Novo destino de recebimento</Text>

            {/* Type picker */}
            <Text style={styles.fieldLabel}>Tipo de chave Pix</Text>
            <View style={styles.typeChips}>
              {DEST_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.typeChip, destType === t.value && styles.typeChipActive]}
                  onPress={() => {
                    setDestType(t.value);
                    setDestPixKey('');
                  }}
                  disabled={destCreating}
                >
                  <Text
                    style={[styles.typeChipText, destType === t.value && styles.typeChipTextActive]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* PixKey input */}
            <Text style={styles.fieldLabel}>Valor da chave</Text>
            <TextInput
              style={styles.editInput}
              value={destPixKey}
              onChangeText={setDestPixKey}
              placeholder={DEST_TYPE_PLACEHOLDER[destType] ?? 'Informe o valor'}
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!destCreating}
            />

            {/* Label */}
            <Text style={styles.fieldLabel}>Apelido (opcional)</Text>
            <TextInput
              style={styles.editInput}
              value={destLabel}
              onChangeText={setDestLabel}
              placeholder="Ex: Conta principal"
              placeholderTextColor={Colors.textMuted}
              editable={!destCreating}
            />

            {/* isDefault toggle */}
            <View style={styles.editDestToggleRow}>
              <Text style={styles.editDestToggleLabel}>Definir como padrão</Text>
              <Switch
                value={destIsDefault}
                onValueChange={setDestIsDefault}
                trackColor={{ false: Colors.border, true: Colors.primary + '88' }}
                thumbColor={destIsDefault ? Colors.primary : Colors.textMuted}
                disabled={destCreating}
              />
            </View>

            {destError && (
              <Text style={styles.destFormError}>{destError}</Text>
            )}

            <View style={styles.editDestActions}>
              <TouchableOpacity
                style={[styles.saveBtn, (!destPixKey.trim() || destCreating) && styles.saveBtnDisabled]}
                onPress={handleCreateDest}
                disabled={!destPixKey.trim() || destCreating}
              >
                {destCreating ? (
                  <ActivityIndicator size={14} color={Colors.white} />
                ) : (
                  <Text style={styles.saveBtnText}>Cadastrar</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowAddDestForm(false);
                  setDestError(null);
                }}
                disabled={destCreating}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ── Account Section ─────────────────────────────────────────── */}
      <View style={[styles.card, styles.accountCard]}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/edit-profile')}>
          <Ionicons name="person-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.menuText}>Editar perfil</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/search' as any)}>
          <Ionicons name="search-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.menuText}>Buscar acordos e pessoas</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/financial-verification' as any)}
        >
          <Ionicons name="shield-checkmark-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.menuText}>Verificação financeira</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings' as any)}>
          <Ionicons name="settings-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.menuText}>Configurações</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, styles.menuItemDanger]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={[styles.menuText, styles.menuTextDanger]}>Sair da conta</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.danger} />
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgBase },
  content: { paddingBottom: Spacing.xxl },

  // ── Avatar header
  avatarSection: {
    backgroundColor: Colors.bgDark,
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    position: 'relative',
  },
  editProfileBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.textOnDarkMuted + '55',
  },
  editProfileText: {
    fontSize: FontSize.xs,
    color: Colors.textOnDarkMuted,
    fontWeight: FontWeight.medium,
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
  fullNameSub: {
    fontSize: FontSize.sm,
    color: Colors.textOnDarkMuted,
    marginTop: 2,
  },
  email: {
    fontSize: FontSize.sm,
    color: Colors.textOnDarkMuted,
    marginTop: 2,
    marginBottom: Spacing.sm,
  },
  city: {
    fontSize: FontSize.xs,
    color: Colors.textOnDarkMuted,
    marginBottom: Spacing.sm,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radii.full,
    borderWidth: 1.5,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xs,
  },
  scoreDot: { width: 8, height: 8, borderRadius: 4 },
  scoreValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  scoreLabel: { fontSize: FontSize.xs, color: Colors.textOnDarkMuted, fontWeight: FontWeight.medium },

  // ── Cards
  card: {
    backgroundColor: Colors.bgCard,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  accountCard: { overflow: 'hidden' },

  // ── Score card
  scoreCard: {
    padding: Spacing.md,
  },
  scoreCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  scoreNumber: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.extrabold,
    lineHeight: 42,
  },
  scoreLevelLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  scoreExplain: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: Spacing.xs,
  },

  // ── Section header
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    lineHeight: 18,
  },

  // ── Error box
  errorBox: {
    backgroundColor: Colors.dangerLight,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: Radii.sm,
    padding: Spacing.sm,
  },
  errorText: { fontSize: FontSize.sm, color: Colors.danger },

  // ── Key display
  keyDisplay: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  keyIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  keyHandle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  keyStatusRow: {
    flexDirection: 'row',
  },
  statusBadge: {
    backgroundColor: Colors.accentLight,
    borderRadius: Radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.accent,
  },
  keyActions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
    flexWrap: 'wrap',
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
  keyBtnDanger: { backgroundColor: Colors.dangerLight },
  keyBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  keyBtnTextDanger: { color: Colors.danger },

  // ── Create key form
  createKeyForm: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  createKeyHint: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  handleInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    backgroundColor: Colors.bgBase,
    overflow: 'hidden',
  },
  atPrefix: {
    paddingLeft: Spacing.md,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  handleInput: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 12,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  checkBtn: {
    backgroundColor: Colors.primaryGlow,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  checkBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  availableText: {
    fontSize: FontSize.sm,
    color: Colors.accent,
    fontWeight: FontWeight.medium,
  },
  unavailableText: {
    fontSize: FontSize.sm,
    color: Colors.danger,
    fontWeight: FontWeight.medium,
  },
  createKeyActions: { flexDirection: 'row', gap: Spacing.sm },
  createBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radii.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  createBtnDisabled: { backgroundColor: Colors.textMuted },
  createBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },

  // ── Empty key state
  emptyKeyState: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  emptyKeyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  emptyKeyHint: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  createKeyTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    marginTop: Spacing.xs,
  },
  createKeyTriggerText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },

  // ── Dev note
  devNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.warningLight,
    borderRadius: Radii.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  devNoteText: {
    fontSize: FontSize.xs,
    color: Colors.warning,
    fontWeight: FontWeight.medium,
  },

  // ── Destination items
  destItem: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  destInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  destTypeBadge: {
    backgroundColor: Colors.primaryGlow,
    borderRadius: Radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  destTypeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  destDetails: { flex: 1 },
  destMasked: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  destLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  destRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  defaultBadge: {
    backgroundColor: Colors.accentLight,
    borderRadius: Radii.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  defaultBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.accent,
  },
  destActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    flexWrap: 'wrap',
  },
  destActionBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radii.full,
    backgroundColor: Colors.bgBase,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  destActionDanger: { borderColor: Colors.danger + '55', backgroundColor: Colors.dangerLight },
  destActionText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  destActionDangerText: { color: Colors.danger },

  // ── Edit dest inline form
  editDestForm: {
    backgroundColor: Colors.bgBase,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  editDestFormTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  editDestFormHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  editInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    backgroundColor: Colors.bgCard,
  },
  editDestToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editDestToggleLabel: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontWeight: FontWeight.medium,
  },
  editDestActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  saveBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radii.md,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  saveBtnDisabled: { backgroundColor: Colors.textMuted },
  saveBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  destFormError: {
    fontSize: FontSize.xs,
    color: Colors.danger,
    fontWeight: FontWeight.medium,
  },

  // ── Empty dest state
  emptyDestState: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  emptyDestTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  emptyDestHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },

  // ── Add dest trigger
  addDestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  addDestBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },

  // ── Add dest form
  addDestForm: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  addDestFormTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  typeChips: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    marginBottom: Spacing.xs,
  },
  typeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgBase,
  },
  typeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  typeChipTextActive: { color: Colors.white },

  // ── Account menu
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  menuItemDanger: {},
  menuText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontWeight: FontWeight.medium,
  },
  menuTextDanger: { color: Colors.danger },

  bottomPad: { height: Spacing.xl },
});
