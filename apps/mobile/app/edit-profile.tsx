import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { authService } from '../src/services/auth.service';
import { usersService } from '../src/services/users.service';
import { PrimaryButton } from '../src/components';
import { Colors, Spacing, Radii, FontSize, FontWeight } from '../src/theme';

function mapError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
    return 'Sessão expirada. Faça login novamente.';
  }
  if (msg.includes('500') || msg.toLowerCase().includes('internal')) {
    return 'Serviço temporariamente indisponível. Tente novamente.';
  }
  return msg || 'Erro ao salvar perfil. Tente novamente.';
}

export default function EditProfileScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const me = await authService.getMe();
        const fullName = me.profile?.fullName ?? '';
        const spaceIdx = fullName.indexOf(' ');
        if (spaceIdx !== -1) {
          setFirstName(fullName.slice(0, spaceIdx));
          setLastName(fullName.slice(spaceIdx + 1));
        } else {
          setFirstName(fullName);
          setLastName('');
        }
        setDisplayName(me.profile?.displayName ?? '');
        setBio(me.profile?.bio ?? '');
      } catch {
        setError('Não foi possível carregar seus dados atuais.');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function handleSave() {
    if (!firstName.trim()) {
      setError('O nome é obrigatório.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await usersService.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      Alert.alert('Perfil atualizado', 'Suas informações foram salvas.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      const msg = mapError(e);
      if (msg.includes('xpirada') || msg.includes('login')) {
        Alert.alert('Sessão expirada', 'Faça login novamente.', [
          { text: 'OK', onPress: () => router.replace('/(auth)/login') },
        ]);
        return;
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informações básicas</Text>
          <Text style={styles.hint}>
            Essas informações aparecem para outras pessoas no Selo.
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Seu primeiro nome"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
              returnKeyType="next"
              editable={!saving}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Sobrenome</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Seu sobrenome"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
              returnKeyType="next"
              editable={!saving}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nome exibido</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Como quer ser chamado(a)"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
              returnKeyType="next"
              editable={!saving}
            />
            <Text style={styles.fieldHint}>
              Usado como nome principal no app, se preenchido.
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={bio}
              onChangeText={setBio}
              placeholder="Uma linha sobre você (opcional)"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              returnKeyType="done"
              editable={!saving}
            />
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            label="Salvar alterações"
            onPress={handleSave}
            loading={saving}
            disabled={saving || !firstName.trim()}
          />
          <PrimaryButton
            label="Cancelar"
            onPress={() => router.back()}
            variant="ghost"
            disabled={saving}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bgBase },
  container: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgBase,
  },
  loadingText: { color: Colors.textSecondary, fontSize: FontSize.md },

  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  hint: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },

  fieldGroup: { marginBottom: Spacing.md },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.bgBase,
  },
  inputMultiline: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  fieldHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 4,
  },

  errorBox: {
    backgroundColor: Colors.dangerLight,
    borderRadius: Radii.sm,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  errorText: { fontSize: FontSize.sm, color: Colors.danger },

  actions: { gap: Spacing.sm },
});
