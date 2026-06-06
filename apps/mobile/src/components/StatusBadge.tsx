import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radii, FontSize, FontWeight } from '../theme';
import type {
  AgreementOperationalStatus,
  AgreementFinancialStatus,
} from '../types/api';

interface StatusConfig {
  label: string;
  bg: string;
  text: string;
}

const OPERATIONAL_MAP: Record<AgreementOperationalStatus, StatusConfig> = {
  AWAITING_ACCEPTANCE: { label: 'Aguardando aceite', bg: Colors.warningLight, text: Colors.warning },
  ACTIVE: { label: 'Ativo', bg: Colors.accentLight, text: Colors.accent },
  AWAITING_CONFIRMATION: { label: 'Aguardando confirmação', bg: Colors.warningLight, text: Colors.warning },
  COMPLETED: { label: 'Concluído', bg: Colors.infoLight, text: Colors.info },
  CANCELLED: { label: 'Cancelado', bg: Colors.borderLight, text: Colors.textSecondary },
  EXPIRED: { label: 'Expirado', bg: Colors.borderLight, text: Colors.textSecondary },
};

const FINANCIAL_MAP: Record<AgreementFinancialStatus, StatusConfig | null> = {
  NOT_APPLICABLE: null,
  AWAITING_PAYMENT: { label: 'Aguardando pagamento', bg: Colors.warningLight, text: Colors.warning },
  FUNDS_HELD: { label: 'Valor protegido', bg: Colors.primaryGlow, text: Colors.primary },
  AWAITING_PAYOUT: { label: 'Aguardando repasse', bg: Colors.warningLight, text: Colors.warning },
  PAID_OUT: { label: 'Repassado', bg: Colors.accentLight, text: Colors.accent },
  AWAITING_REFUND: { label: 'Aguardando reembolso', bg: Colors.warningLight, text: Colors.warning },
  REFUNDED: { label: 'Reembolsado', bg: Colors.infoLight, text: Colors.info },
  DISPUTED: { label: 'Em disputa', bg: Colors.dangerLight, text: Colors.danger },
};

interface Props {
  operationalStatus: AgreementOperationalStatus;
  financialStatus?: AgreementFinancialStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ operationalStatus, financialStatus, size = 'md' }: Props) {
  const opConfig = OPERATIONAL_MAP[operationalStatus];
  const finConfig = financialStatus ? FINANCIAL_MAP[financialStatus] : null;

  const fontSize = size === 'sm' ? FontSize.xs : FontSize.sm;
  const paddingV = size === 'sm' ? 2 : 3;
  const paddingH = size === 'sm' ? 6 : 8;

  return (
    <View style={styles.row}>
      <View style={[styles.badge, { backgroundColor: opConfig.bg, paddingVertical: paddingV, paddingHorizontal: paddingH }]}>
        <Text style={[styles.text, { color: opConfig.text, fontSize }]}>{opConfig.label}</Text>
      </View>
      {finConfig && (
        <View style={[styles.badge, { backgroundColor: finConfig.bg, paddingVertical: paddingV, paddingHorizontal: paddingH }]}>
          <Text style={[styles.text, { color: finConfig.text, fontSize }]}>{finConfig.label}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  badge: { borderRadius: Radii.full, alignSelf: 'flex-start' },
  text: { fontWeight: FontWeight.semibold },
});
