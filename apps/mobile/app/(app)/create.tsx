import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, Radii, FontSize, FontWeight, Shadow } from '../../src/theme';

interface CreateOption {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  bgColor: string;
  type: 'receive' | 'pay' | 'custom' | 'guaranteed';
}

const OPTIONS: CreateOption[] = [
  {
    icon: 'arrow-down-circle',
    title: 'Valor a receber',
    subtitle: 'Registre um valor que alguém vai pagar para você.',
    description: 'Outra pessoa vai te pagar por algo',
    color: Colors.accent,
    bgColor: Colors.accentLight,
    type: 'receive',
  },
  {
    icon: 'arrow-up-circle',
    title: 'Valor a pagar',
    subtitle: 'Registre um valor que você vai pagar para alguém.',
    description: 'Você vai pagar outra pessoa por algo',
    color: Colors.warning,
    bgColor: Colors.warningLight,
    type: 'pay',
  },
  {
    icon: 'document-text',
    title: 'Acordo personalizado',
    subtitle: 'Crie um combinado com prazo, participantes e condições.',
    description: 'Crie um combinado com seus próprios termos',
    color: Colors.info,
    bgColor: Colors.infoLight,
    type: 'custom',
  },
  {
    icon: 'shield-checkmark',
    title: 'Acordo com garantia',
    subtitle: 'Proteja um valor até o combinado ser cumprido.',
    description: 'Valor protegido até o combinado ser cumprido',
    color: Colors.primary,
    bgColor: Colors.primaryGlow,
    type: 'guaranteed',
  },
];

export default function CreateScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>O que você quer criar?</Text>
      <Text style={styles.subheading}>
        Escolha o tipo de combinado que melhor descreve o que você precisa.
      </Text>

      {OPTIONS.map((opt, i) => (
        <TouchableOpacity
          key={i}
          style={styles.card}
          onPress={() => router.push(`/create-agreement?type=${opt.type}` as never)}
          activeOpacity={0.75}
        >
          <View style={[styles.iconWrap, { backgroundColor: opt.bgColor }]}>
            <Ionicons name={opt.icon} size={28} color={opt.color} />
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.cardTitle}>{opt.title}</Text>
            <Text style={styles.cardSubtitle}>{opt.subtitle}</Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      ))}

      <View style={styles.infoBanner}>
        <Ionicons name="shield-checkmark-outline" size={20} color={Colors.accent} />
        <Text style={styles.infoText}>
          Seus combinados ficam registrados com histórico e rastreabilidade. Para acordos com valor protegido, a outra parte precisa aceitar antes do depósito.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgBase },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  heading: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subheading: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { flex: 1 },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  infoBanner: {
    backgroundColor: Colors.accentLight,
    borderRadius: Radii.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.accent,
    lineHeight: 20,
    fontWeight: FontWeight.medium,
  },
});
