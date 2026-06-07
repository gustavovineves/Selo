import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { agreementsService } from '../src/services/agreements.service';
import { receivingKeysService } from '../src/services/receiving-keys.service';
import { Colors, Spacing, FontSize, FontWeight, Radii, Shadow } from '../src/theme';
import type { AgreementListItem } from '../src/types/api';

type KeyResult = {
  userId: string;
  key: string;
  displayName: string | null;
  avatarUrl: string | null;
};

type Section =
  | { kind: 'agreements'; data: AgreementListItem[] }
  | { kind: 'people'; data: KeyResult[] };

const STATUS_LABEL: Record<string, string> = {
  AWAITING_ACCEPTANCE: 'Aguardando aceite',
  ACTIVE: 'Ativo',
  AWAITING_CONFIRMATION: 'Aguardando confirmação',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Expirado',
};

const STATUS_COLOR: Record<string, string> = {
  AWAITING_ACCEPTANCE: Colors.warning,
  ACTIVE: Colors.accent,
  AWAITING_CONFIRMATION: Colors.warning,
  COMPLETED: Colors.accent,
  CANCELLED: Colors.textMuted,
  EXPIRED: Colors.textMuted,
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function formatBRL(amount: number | null) {
  if (!amount) return null;
  return `R$ ${amount.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [allAgreements, setAllAgreements] = useState<AgreementListItem[]>([]);
  const [filteredAgreements, setFilteredAgreements] = useState<AgreementListItem[]>([]);
  const [keyResult, setKeyResult] = useState<KeyResult | null>(null);
  const [loadingAgreements, setLoadingAgreements] = useState(true);
  const [searchingKey, setSearchingKey] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const keyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadAgreements();
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  async function loadAgreements() {
    try {
      const res = await agreementsService.list({ limit: 100 });
      setAllAgreements(res.data ?? []);
    } catch {
      /* silencioso */
    } finally {
      setLoadingAgreements(false);
    }
  }

  useEffect(() => {
    if (!query.trim()) {
      setFilteredAgreements([]);
      setKeyResult(null);
      return;
    }

    const q = query.toLowerCase().trim();

    // Filtra acordos localmente por título, descrição e nome do participante
    const matched = allAgreements.filter((a) => {
      const inTitle = a.title.toLowerCase().includes(q);
      const inDesc = a.description?.toLowerCase().includes(q);
      const inParticipant = a.participants?.some((p) =>
        p.user?.profile?.displayName?.toLowerCase().includes(q) ||
        p.user?.profile?.fullName?.toLowerCase().includes(q),
      );
      return inTitle || inDesc || inParticipant;
    });
    setFilteredAgreements(matched);

    // Busca por chave @handle (debounce 400ms)
    if (query.startsWith('@') || /^[a-z0-9._-]{3,}$/i.test(query)) {
      if (keyTimerRef.current) clearTimeout(keyTimerRef.current);
      keyTimerRef.current = setTimeout(async () => {
        setSearchingKey(true);
        try {
          const res = await receivingKeysService.resolve(query.replace(/^@/, ''));
          setKeyResult({
            userId: res.userId,
            key: res.key,
            displayName: res.displayName,
            avatarUrl: res.avatarUrl,
          });
        } catch {
          setKeyResult(null);
        } finally {
          setSearchingKey(false);
        }
      }, 400);
    } else {
      setKeyResult(null);
    }
  }, [query, allAgreements]);

  const hasResults = filteredAgreements.length > 0 || keyResult !== null;
  const isEmpty = query.trim().length > 0 && !loadingAgreements && !searchingKey && !hasResults;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Buscar acordos, pessoas ou chaves..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            {loadingAgreements && (
              <View style={styles.centered}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.hint}>Carregando seus combinados...</Text>
              </View>
            )}

            {!query && !loadingAgreements && (
              <View style={styles.centered}>
                <Ionicons name="search-outline" size={48} color={Colors.border} />
                <Text style={styles.emptyTitle}>Buscar no Selo</Text>
                <Text style={styles.emptyDesc}>
                  Digite o título de um combinado, nome de uma pessoa ou a chave de recebimento
                  (como @maria).
                </Text>
              </View>
            )}

            {isEmpty && (
              <View style={styles.centered}>
                <Ionicons name="search-outline" size={48} color={Colors.border} />
                <Text style={styles.emptyTitle}>Nenhum resultado</Text>
                <Text style={styles.emptyDesc}>
                  Não encontramos nada para "{query}". Tente outros termos ou a chave `@handle`
                  de alguém.
                </Text>
              </View>
            )}

            {searchingKey && (
              <View style={styles.searchingKey}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.hint}>Buscando chave...</Text>
              </View>
            )}

            {keyResult && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pessoa encontrada</Text>
                <TouchableOpacity style={styles.personCard} activeOpacity={0.8}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(keyResult.displayName || keyResult.key).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.personInfo}>
                    <Text style={styles.personName}>
                      {keyResult.displayName || `@${keyResult.key}`}
                    </Text>
                    <Text style={styles.personKey}>@{keyResult.key}</Text>
                  </View>
                  <Ionicons name="person-add-outline" size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            )}

            {filteredAgreements.length > 0 && (
              <Text style={[styles.sectionTitle, { marginTop: keyResult ? Spacing.md : 0 }]}>
                Combinados ({filteredAgreements.length})
              </Text>
            )}
          </>
        }
        data={filteredAgreements}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.agreementCard}
            onPress={() => router.push(`/agreement/${item.id}` as any)}
            activeOpacity={0.8}
          >
            <View style={styles.agreementTop}>
              <Text style={styles.agreementTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.operationalStatus] + '22' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOR[item.operationalStatus] }]}>
                  {STATUS_LABEL[item.operationalStatus] ?? item.operationalStatus}
                </Text>
              </View>
            </View>
            <View style={styles.agreementBottom}>
              {item.amount && (
                <Text style={styles.amount}>{formatBRL(item.amount)}</Text>
              )}
              {item.dueDate && (
                <Text style={styles.dueDate}>Prazo: {formatDate(item.dueDate)}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bgBase },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.bgDark,
    paddingHorizontal: Spacing.md,
    paddingTop: 52,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    padding: 4,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radii.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.white,
  },
  list: { flex: 1 },
  listContent: { padding: Spacing.md, paddingBottom: 48 },
  centered: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  emptyDesc: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  searchingKey: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  hint: { fontSize: FontSize.sm, color: Colors.textMuted },
  section: { marginBottom: Spacing.md },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white },
  personInfo: { flex: 1 },
  personName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  personKey: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
  agreementCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  agreementTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  agreementTitle: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginRight: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  agreementBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amount: { fontSize: FontSize.sm, color: Colors.accent, fontWeight: FontWeight.medium },
  dueDate: { fontSize: FontSize.sm, color: Colors.textMuted },
  separator: { height: Spacing.sm },
});
