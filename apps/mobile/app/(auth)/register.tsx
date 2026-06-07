import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router, Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { authService } from '../../src/services/auth.service';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Colors, Spacing, Radii, FontSize, FontWeight } from '../../src/theme';

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    if (!firstName.trim() || !email.trim() || !password.trim()) {
      setError('Nome, e-mail e senha são obrigatórios.');
      return;
    }
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.register({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim().toLowerCase(),
        password,
      });
      router.replace('/(onboarding)/setup-key');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.top}>
          <Text style={styles.appName}>Selo</Text>
          <Text style={styles.tagline}>Crie sua conta</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Criar conta</Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.row}>
            <View style={[styles.field, styles.flex]}>
              <Text style={styles.label}>Nome *</Text>
              <TextInput
                style={styles.input}
                placeholder="Maria"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
            <View style={[styles.field, styles.flex]}>
              <Text style={styles.label}>Sobrenome</Text>
              <TextInput
                style={styles.input}
                placeholder="Silva"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>E-mail *</Text>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Senha *</Text>
            <TextInput
              style={styles.input}
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <PrimaryButton
            label="Criar conta"
            onPress={handleRegister}
            loading={loading}
            style={styles.button}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Já tem conta? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Entrar</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bgDark },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
  top: { alignItems: 'center', marginBottom: Spacing.xl },
  appName: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.white,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: FontSize.md,
    color: Colors.textOnDarkMuted,
    marginTop: Spacing.xs,
  },
  form: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
  },
  formTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  errorBox: {
    backgroundColor: Colors.dangerLight,
    borderRadius: Radii.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorText: { color: Colors.danger, fontSize: FontSize.sm },
  row: { flexDirection: 'row', gap: Spacing.sm },
  field: { marginBottom: Spacing.md },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.bgBase,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  button: { marginTop: Spacing.sm },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  footerText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  footerLink: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
});
