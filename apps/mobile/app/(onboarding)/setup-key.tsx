import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { receivingKeysService } from '../../src/services/receiving-keys.service';
import { Colors, Spacing, FontSize, FontWeight, Radii, Shadow } from '../../src/theme';

export default function SetupKeyScreen() {
  const [handle, setHandle] = useState('');
  const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [creating, setCreating] = useState(false);

  function normalize(raw: string) {
    return raw.replace(/^@/, '').toLowerCase().trim();
  }

  async function checkAvailability() {
    const key = normalize(handle);
    if (!key || key.length < 3) {
      setCheckStatus('invalid');
      return;
    }
    setCheckStatus('checking');
    try {
      const result = await receivingKeysService.check(key);
      setCheckStatus(result.available ? 'available' : 'taken');
    } catch {
      setCheckStatus('idle');
    }
  }

  async function createKey() {
    const key = normalize(handle);
    if (!key || key.length < 3) {
      Alert.alert('Handle inválido', 'Use pelo menos 3 caracteres: letras, números, ponto, underline ou hífen.');
      return;
    }
    setCreating(true);
    try {
      await receivingKeysService.create(key);
      router.replace('/(onboarding)/tutorial');
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível criar a chave.');
    } finally {
      setCreating(false);
    }
  }

  const statusColor = checkStatus === 'available' ? Colors.accent : checkStatus === 'taken' ? Colors.danger : Colors.textMuted;
  const statusIcon =
    checkStatus === 'available' ? 'checkmark-circle-outline' :
    checkStatus === 'taken' ? 'close-circle-outline' :
    checkStatus === 'invalid' ? 'alert-circle-outline' : null;
  const statusMsg =
    checkStatus === 'available' ? 'Disponível! Você pode usar este handle.' :
    checkStatus === 'taken' ? 'Já está em uso. Tente outro.' :
    checkStatus === 'invalid' ? 'Use pelo menos 3 caracteres.' : '';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.topBar}>
          <Text style={styles.step}>2 de 3</Text>
          <TouchableOpacity onPress={() => router.replace('/(onboarding)/tutorial')}>
            <Text style={styles.skipLink}>Pular</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.iconWrap}>
          <Ionicons name="at-outline" size={40} color={Colors.primary} />
        </View>

        <Text style={styles.title}>Crie sua chave de recebimento</Text>
        <Text style={styles.subtitle}>
          Sua chave é o seu endereço dentro do Selo. Outras pessoas usam ela para te enviar combinados.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Minha chave</Text>
          <View style={styles.inputRow}>
            <Text style={styles.at}>@</Text>
            <TextInput
              style={styles.input}
              placeholder="seunome"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              value={handle}
              onChangeText={(t) => {
                setHandle(t.replace(/^@/, ''));
                setCheckStatus('idle');
              }}
            />
          </View>
          <Text style={styles.hint}>3–30 caracteres: letras, números, ponto, underline ou hífen.</Text>

          {statusMsg ? (
            <View style={styles.statusRow}>
              {statusIcon && <Ionicons name={statusIcon as any} size={16} color={statusColor} />}
              <Text style={[styles.statusText, { color: statusColor }]}>{statusMsg}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.checkBtn} onPress={checkAvailability} activeOpacity={0.8}>
            {checkStatus === 'checking' ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.checkBtnText}>Verificar disponibilidade</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.primary} style={{ marginTop: 1 }} />
          <Text style={styles.infoText}>
            Sua chave é interna ao Selo — <Text style={styles.bold}>não é uma chave Pix</Text> e não
            é cadastrada no Banco Central. Você pode criá-la agora ou depois no seu Perfil.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.mainBtn, checkStatus !== 'available' && styles.mainBtnDisabled]}
          onPress={createKey}
          disabled={checkStatus !== 'available' || creating}
          activeOpacity={0.85}
        >
          {creating ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.mainBtnText}>Criar minha chave</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={() => router.replace('/(onboarding)/tutorial')}>
          <Text style={styles.skipBtnText}>Criar depois →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  step: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: FontWeight.medium },
  skipLink: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(91,33,182,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    alignSelf: 'center',
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    ...Shadow.sm,
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgBase,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  at: {
    fontSize: FontSize.xl,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
    marginRight: 4,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    paddingVertical: 12,
  },
  hint: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.sm },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  statusText: { fontSize: FontSize.sm },
  checkBtn: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radii.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  checkBtnText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },
  infoBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: 'rgba(91,33,182,0.07)',
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18 },
  bold: { fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  mainBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.xl,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  mainBtnDisabled: { backgroundColor: Colors.border },
  mainBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.white },
  skipBtn: { paddingVertical: 12, alignItems: 'center' },
  skipBtnText: { fontSize: FontSize.md, color: Colors.textMuted },
});
