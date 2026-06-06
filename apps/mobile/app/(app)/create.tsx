import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radii, FontSize, FontWeight, Shadow } from '../../src/theme';

interface CreateOption {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  color: string;
  bgColor: string;
}

const OPTIONS: CreateOption[] = [
  {
    icon: 'arrow-down-circle',
    title: 'Valor a receber',
    subtitle: 'Outra pessoa vai te pagar por algo',
    color: Colors.accent,
    bgColor: Colors.accentLight,
  },
  {
    icon: 'arrow-up-circle',
    title: 'Valor a pagar',
    subtitle: 'Você vai pagar outra pessoa por algo',
    color: Colors.warning,
    bgColor: Colors.warningLight,
  },
  {
    icon: 'document-text',
    title: 'Acordo personalizado',
    subtitle: 'Crie um combinado com seus próprios termos',
    color: Colors.info,
    bgColor: Colors.infoLight,
  },
  {
    icon: 'shield-checkmark',
    title: 'Acordo com garantia',
    subtitle: 'Valor protegido até o combinado ser cumprido',
    color: Colors.primary,
    bgColor: Colors.primaryGlow,
  },
];

function showComingSoon() {
  Alert.alert(
    'Em breve',
    'O fluxo de criação de combinados será implementado na próxima fase. Fique ligado!',
    [{ text: 'Entendi', style: 'default' }],
  );
}

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
          onPress={showComingSoon}
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

      <View style={styles.comingBanner}>
        <Ionicons name="time-outline" size={20} color={Colors.primary} />
        <Text style={styles.comingText}>
          Criação completa de combinados disponível na próxima fase.
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
  comingBanner: {
    backgroundColor: Colors.primaryGlow,
    borderRadius: Radii.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  comingText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.primary,
    lineHeight: 20,
    fontWeight: FontWeight.medium,
  },
});
