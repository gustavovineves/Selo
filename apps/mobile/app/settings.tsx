import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../src/services/auth.service';
import { Colors, Spacing, FontSize, FontWeight, Radii, Shadow } from '../src/theme';

type Section = 'security' | 'privacy' | 'help' | null;

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function MenuItem({
  icon,
  label,
  onPress,
  badge,
  danger,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
  badge?: string;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, danger && styles.menuItemDanger]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={danger ? Colors.danger : Colors.textSecondary}
      />
      <Text style={[styles.menuText, danger && styles.menuTextDanger]}>{label}</Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

function InfoBox({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.infoBox}>
      <Ionicons name={icon as any} size={18} color={Colors.primary} style={{ marginTop: 1 }} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const [expanded, setExpanded] = useState<Section>(null);

  function toggle(section: Section) {
    setExpanded((prev) => (prev === section ? null : section));
  }

  async function handleLogout() {
    Alert.alert('Sair da conta', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await authService.logout();
          } catch {
            /* silencioso */
          }
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurações</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Conta ─────────────────────────────────────────────────── */}
        <SectionHeader title="Conta" />
        <View style={styles.card}>
          <MenuItem
            icon="person-outline"
            label="Editar perfil"
            onPress={() => router.push('/edit-profile')}
          />
          <MenuItem
            icon="search-outline"
            label="Buscar acordos e pessoas"
            onPress={() => router.push('/search' as any)}
          />
        </View>

        {/* ── Segurança ─────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.sectionHeaderBtn}
          onPress={() => toggle('security')}
          activeOpacity={0.8}
        >
          <SectionHeader title="Segurança" />
          <Ionicons
            name={expanded === 'security' ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Colors.textMuted}
          />
        </TouchableOpacity>

        {expanded === 'security' && (
          <View style={styles.card}>
            <InfoBox
              icon="shield-checkmark-outline"
              text="Sua conta é protegida por e-mail e senha. Em versões futuras, suportaremos biometria e PIN."
            />

            <MenuItem
              icon="log-out-outline"
              label="Encerrar sessão atual"
              onPress={handleLogout}
              danger
            />

            <MenuItem
              icon="phone-portrait-outline"
              label="Dispositivos e sessões"
              badge="Em breve"
            />

            <MenuItem
              icon="finger-print-outline"
              label="Biometria / PIN"
              badge="Em breve"
            />

            <View style={styles.divider} />
            <Text style={styles.securityNote}>
              Ao detectar acesso suspeito, sua sessão é automaticamente encerrada. Você será
              notificado para fazer login novamente.
            </Text>
          </View>
        )}

        {/* ── Privacidade ───────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.sectionHeaderBtn}
          onPress={() => toggle('privacy')}
          activeOpacity={0.8}
        >
          <SectionHeader title="Privacidade" />
          <Ionicons
            name={expanded === 'privacy' ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Colors.textMuted}
          />
        </TouchableOpacity>

        {expanded === 'privacy' && (
          <View style={styles.card}>
            <InfoBox
              icon="eye-off-outline"
              text="O Selo armazena apenas os dados necessários para registrar seus combinados. Nunca vendemos ou compartilhamos seus dados com terceiros sem sua autorização."
            />

            <View style={styles.privacyItem}>
              <Text style={styles.privacyTitle}>O que armazenamos</Text>
              <Text style={styles.privacyDesc}>
                • Nome e e-mail da conta{'\n'}
                • Histórico de combinados e eventos{'\n'}
                • Chave de Recebimento do App (@handle){'\n'}
                • Destino de Recebimento mascarado{'\n'}
                • Score de confiança baseado no histórico
              </Text>
            </View>

            <View style={styles.privacyItem}>
              <Text style={styles.privacyTitle}>O que NÃO armazenamos</Text>
              <Text style={styles.privacyDesc}>
                • Dados completos de chave Pix (armazenamos apenas o valor mascarado){'\n'}
                • Dados bancários completos{'\n'}
                • CPF (solicitado apenas quando necessário, em versões futuras)
              </Text>
            </View>

            <MenuItem
              icon="document-text-outline"
              label="Termos de Uso"
              badge="Em breve"
            />

            <MenuItem
              icon="lock-closed-outline"
              label="Política de Privacidade"
              badge="Em breve"
            />
          </View>
        )}

        {/* ── Ajuda ─────────────────────────────────────────────────── */}
        <SectionHeader title="Ajuda e Suporte" />
        <View style={styles.card}>
          <MenuItem
            icon="help-circle-outline"
            label="Central de Ajuda"
            onPress={() => router.push('/help' as any)}
          />
          <MenuItem
            icon="document-text-outline"
            label="Termos de Uso"
            badge="Em breve"
          />
          <MenuItem
            icon="lock-closed-outline"
            label="Política de Privacidade"
            badge="Em breve"
          />
        </View>

        {/* ── Beta ──────────────────────────────────────────────────── */}
        <SectionHeader title="Beta Fechado" />
        <View style={styles.card}>
          <InfoBox
            icon="flask-outline"
            text="Você está no beta fechado do Selo. Nenhum dinheiro real é movimentado. Tudo que você faz aqui é para testar a experiência do produto."
          />
          <MenuItem
            icon="chatbubble-ellipses-outline"
            label="Enviar feedback do beta"
            onPress={() => router.push('/(app)/profile' as any)}
          />
        </View>

        <View style={{ height: 48 }} />
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
  content: { padding: Spacing.md },
  sectionHeader: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    paddingHorizontal: 4,
  },
  sectionHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.xl,
    overflow: 'hidden',
    ...Shadow.sm,
    marginBottom: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemDanger: { borderBottomWidth: 0 },
  menuText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  menuTextDanger: { color: Colors.danger },
  badge: {
    backgroundColor: Colors.bgBase,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeText: { fontSize: FontSize.xs, color: Colors.textMuted },
  infoBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: 'rgba(91,33,182,0.06)',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  securityNote: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 18,
    padding: Spacing.md,
  },
  privacyItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  privacyTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  privacyDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  helpItem: { padding: Spacing.md },
  helpIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 8,
  },
  helpTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    flex: 1,
  },
  helpDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
});
