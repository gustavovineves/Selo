import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { Colors, Spacing, FontSize, FontWeight, Radii } from '../../src/theme';

function markWelcomeSeen() {
  SecureStore.setItemAsync('welcome_seen', '1').catch(() => {});
}

const FEATURES = [
  {
    icon: 'document-text-outline' as const,
    title: 'Combinados simples',
    desc: 'Registre qualquer combinado com prazo e histórico.',
  },
  {
    icon: 'lock-closed-outline' as const,
    title: 'Valor protegido',
    desc: 'O dinheiro fica guardado até ambas as partes confirmarem.',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Prova e histórico',
    desc: 'Tudo registrado. Score de confiança baseado no seu histórico.',
  },
];

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgDark} />

      <View style={styles.header}>
        <Text style={styles.logo}>Selo</Text>
        <Text style={styles.tagline}>A carteira dos seus combinados.</Text>
      </View>

      <View style={styles.features}>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Ionicons name={f.icon} size={22} color={Colors.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => { markWelcomeSeen(); router.push('/(auth)/register'); }}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>Criar conta</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => { markWelcomeSeen(); router.push('/(auth)/login'); }}
          activeOpacity={0.85}
        >
          <Text style={styles.btnSecondaryText}>Já tenho conta</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Ao continuar, você concorda com os Termos de Uso e a Política de Privacidade do Selo.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgDark,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  header: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 52,
    fontWeight: FontWeight.extrabold,
    color: Colors.white,
    letterSpacing: 3,
    marginBottom: Spacing.sm,
  },
  tagline: {
    fontSize: FontSize.lg,
    color: Colors.textOnDarkMuted,
    textAlign: 'center',
    lineHeight: 26,
  },
  features: {
    flex: 1.2,
    justifyContent: 'center',
    gap: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: Radii.lg,
    padding: Spacing.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(91,33,182,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1 },
  featureTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: FontSize.sm,
    color: Colors.textOnDarkMuted,
    lineHeight: 18,
  },
  actions: {
    gap: Spacing.sm,
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.xl,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  btnSecondary: {
    borderRadius: Radii.xl,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  btnSecondaryText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.white,
  },
  disclaimer: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 16,
  },
});
