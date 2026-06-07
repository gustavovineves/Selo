import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight, Radii, Shadow } from '../src/theme';
import type { TrustScoreLevel } from '../src/types/api';

const LEVEL_LABELS: Record<TrustScoreLevel, string> = {
  VERY_LOW: 'Em formação',
  LOW: 'Em evolução',
  MEDIUM: 'Estabelecido',
  HIGH: 'Histórico positivo',
  VERY_HIGH: 'Referência',
  EXCELLENT: 'Excelente',
};

const LEVEL_COLORS: Record<TrustScoreLevel, string> = {
  VERY_LOW: Colors.textMuted,
  LOW: Colors.warning,
  MEDIUM: Colors.warning,
  HIGH: Colors.accent,
  VERY_HIGH: Colors.accent,
  EXCELLENT: Colors.primary,
};

const LEVEL_DESC: Record<TrustScoreLevel, string> = {
  VERY_LOW: 'Você está começando sua história no Selo. Continue fazendo e cumprindo combinados.',
  LOW: 'Seu histórico está crescendo. Cada combinado concluído faz diferença.',
  MEDIUM: 'Você tem um histórico estabelecido. Continue construindo confiança.',
  HIGH: 'Seu histórico é positivo. Outras pessoas tendem a confiar em você.',
  VERY_HIGH: 'Você é uma referência de confiança no Selo.',
  EXCELLENT: 'Histórico excepcional. Você está entre os usuários mais confiáveis.',
};

const FACTORS_POSITIVE = [
  { icon: 'checkmark-circle-outline', text: 'Combinados concluídos (+20 pontos por conclusão)' },
  { icon: 'star-outline', text: 'Disputas ganhas (+30 pontos por vitória administrativa)' },
  { icon: 'time-outline', text: 'Cumprimento dentro do prazo (fator positivo futuro)' },
];

const FACTORS_NEGATIVE = [
  { icon: 'close-circle-outline', text: 'Cancelamentos por iniciativa própria (−10 pontos)' },
  { icon: 'alert-circle-outline', text: 'Disputas perdidas (−20 pontos MVP)' },
];

function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, (score / 1000) * 100));
  const color =
    pct < 30 ? Colors.danger :
    pct < 50 ? Colors.warning :
    pct < 70 ? Colors.warning :
    Colors.accent;

  return (
    <View style={styles.barContainer}>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <View style={styles.barLabels}>
        <Text style={styles.barLabel}>0</Text>
        <Text style={styles.barLabel}>500</Text>
        <Text style={styles.barLabel}>1000</Text>
      </View>
    </View>
  );
}

export default function TrustScoreScreen() {
  const { score, level } = useLocalSearchParams<{ score: string; level: string }>();
  const numScore = parseInt(score ?? '500', 10);
  const lvl = (level ?? 'MEDIUM') as TrustScoreLevel;
  const levelColor = LEVEL_COLORS[lvl] ?? Colors.warning;
  const levelLabel = LEVEL_LABELS[lvl] ?? 'Em formação';
  const levelDesc = LEVEL_DESC[lvl] ?? '';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Score de confiança</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Cartão principal */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreNumber}>{numScore}</Text>
          <Text style={styles.scoreMax}>de 1000</Text>
          <View style={[styles.levelBadge, { backgroundColor: levelColor + '22' }]}>
            <Text style={[styles.levelText, { color: levelColor }]}>{levelLabel}</Text>
          </View>
          <ScoreBar score={numScore} />
          <Text style={styles.levelDesc}>{levelDesc}</Text>
        </View>

        {/* O que é o score */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>O que é o score?</Text>
          <Text style={styles.bodyText}>
            O score de confiança reflete seu histórico de combinados no Selo. Ele é calculado com
            base em como você lida com seus acordos — não é uma avaliação moral, mas um resumo do
            seu comportamento na plataforma.
          </Text>
          <Text style={styles.bodyText}>
            Começamos todos com 500 pontos e construímos a partir daí. O score é público e visível
            para outros usuários ao criarem um combinado com você.
          </Text>
        </View>

        {/* Fatores positivos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>O que melhora seu score</Text>
          {FACTORS_POSITIVE.map((f) => (
            <View key={f.text} style={styles.factorRow}>
              <Ionicons name={f.icon as any} size={20} color={Colors.accent} />
              <Text style={styles.factorText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Fatores negativos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>O que pode reduzir seu score</Text>
          {FACTORS_NEGATIVE.map((f) => (
            <View key={f.text} style={styles.factorRow}>
              <Ionicons name={f.icon as any} size={20} color={Colors.warning} />
              <Text style={styles.factorText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Nota sobre linguagem */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.primary} style={{ marginTop: 1 }} />
          <Text style={styles.infoText}>
            O Selo não usa termos como "mau pagador" ou "suspeito". Seu histórico é seu — e melhora
            com cada combinado cumprido.
          </Text>
        </View>

        {/* Tabela de níveis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Níveis do score</Text>
          {Object.entries(LEVEL_LABELS).map(([key, label]) => (
            <View key={key} style={[styles.levelRow, lvl === key && styles.levelRowActive]}>
              <View style={[styles.levelDot, { backgroundColor: LEVEL_COLORS[key as TrustScoreLevel] }]} />
              <Text style={[styles.levelRowText, lvl === key && styles.levelRowTextActive]}>
                {label}
              </Text>
              {lvl === key && (
                <Ionicons name="chevron-back" size={14} color={Colors.primary} style={{ transform: [{ rotate: '180deg' }] }} />
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgBase },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgDark,
    paddingTop: 52,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  content: { padding: Spacing.lg, paddingBottom: 48 },
  scoreCard: {
    backgroundColor: Colors.bgDark,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    ...Shadow.md,
  },
  scoreNumber: {
    fontSize: 64,
    fontWeight: FontWeight.extrabold,
    color: Colors.white,
    lineHeight: 72,
  },
  scoreMax: {
    fontSize: FontSize.sm,
    color: Colors.textOnDarkMuted,
    marginBottom: Spacing.sm,
  },
  levelBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: Radii.full,
    marginBottom: Spacing.lg,
  },
  levelText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  barContainer: { width: '100%', marginBottom: Spacing.md },
  barBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  barLabel: { fontSize: FontSize.xs, color: Colors.textOnDarkMuted },
  levelDesc: {
    fontSize: FontSize.sm,
    color: Colors.textOnDarkMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  bodyText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  factorText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: 'rgba(91,33,182,0.07)',
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  levelRowActive: {
    backgroundColor: 'rgba(91,33,182,0.05)',
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm,
  },
  levelDot: { width: 10, height: 10, borderRadius: 5 },
  levelRowText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary },
  levelRowTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
});
