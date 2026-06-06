import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useAgreements } from '../../src/hooks/useAgreements';
import type { ListAgreementsParams } from '../../src/services/agreements.service';
import { AgreementCard, EmptyState, LoadingState } from '../../src/components';
import { Colors, Spacing, Radii, FontSize, FontWeight } from '../../src/theme';
import { mapError } from '../../src/utils/errors';

interface FilterOption {
  label: string;
  params: ListAgreementsParams;
}

const FILTERS: FilterOption[] = [
  { label: 'Todos', params: {} },
  { label: 'Ativos', params: { status: 'ACTIVE' } },
  { label: 'Aguardando aceite', params: { status: 'AWAITING_ACCEPTANCE' } },
  { label: 'A pagar', params: { financialStatus: 'AWAITING_PAYMENT' } },
  { label: 'A receber', params: { myRole: 'receiver' } },
  { label: 'Com garantia', params: { hasGuarantee: true } },
  { label: 'Em disputa', params: { inDispute: true } },
  { label: 'Aguardando minha ação', params: { pendingMyAction: true } },
  { label: 'Concluídos', params: { status: 'COMPLETED' } },
];

export default function AgreementsScreen() {
  const [activeFilter, setActiveFilter] = useState(0);
  const { agreements, total, loading, error, refresh } = useAgreements();

  useEffect(() => {
    refresh(FILTERS[activeFilter].params);
  }, [activeFilter]);

  function handleFilterPress(index: number) {
    setActiveFilter(index);
  }

  const currentParams = FILTERS[activeFilter].params;

  return (
    <View style={styles.container}>
      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map((f, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.chip, activeFilter === i && styles.chipActive]}
            onPress={() => handleFilterPress(i)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, activeFilter === i && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Count */}
      {!loading && !error && (
        <Text style={styles.count}>
          {total} combinado{total !== 1 ? 's' : ''}
        </Text>
      )}

      {/* List */}
      {loading ? (
        <LoadingState message="Carregando combinados..." />
      ) : error ? (
        <View style={styles.errorContainer}>
          <EmptyState
            icon="cloud-offline-outline"
            title="Não foi possível carregar"
            subtitle={mapError(new Error(error))}
          />
          <TouchableOpacity
            onPress={() => refresh(currentParams)}
            style={styles.retryButton}
            activeOpacity={0.7}
          >
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={agreements}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AgreementCard item={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="document-outline"
              title="Nenhum combinado aqui"
              subtitle="Tente outro filtro ou crie seu primeiro combinado."
            />
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => refresh(currentParams)}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgBase },
  filterBar: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.full,
    backgroundColor: Colors.bgBase,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.white,
    fontWeight: FontWeight.semibold,
  },
  count: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
