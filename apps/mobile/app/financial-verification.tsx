import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { usersService } from '../src/services/users.service';
import type { FinancialProfileResponse } from '../src/types/api';

type KycStatus = FinancialProfileResponse['kycStatus'];

function StatusBanner({ status, label, message }: { status: KycStatus; label: string; message: string }) {
  const colors: Record<KycStatus, string> = {
    PENDING: '#64748b',
    SUBMITTED: '#d97706',
    UNDER_REVIEW: '#2563eb',
    APPROVED: '#16a34a',
    REJECTED: '#dc2626',
  };
  return (
    <View style={[styles.statusBanner, { borderLeftColor: colors[status] }]}>
      <Text style={[styles.statusLabel, { color: colors[status] }]}>{label}</Text>
      <Text style={styles.statusMessage}>{message}</Text>
    </View>
  );
}

export default function FinancialVerificationScreen() {
  const [profile, setProfile] = useState<FinancialProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await usersService.getFinancialProfile();
      setProfile(data);
      if (data.fullName) setFullName(data.fullName);
      if (data.phone) setPhone(data.phone);
      if (data.acceptedFinancialTerms) setAcceptedTerms(true);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os dados de verificação.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (cpf && !/^\d{11}$/.test(cpf.replace(/\D/g, ''))) {
      Alert.alert('CPF inválido', 'Informe apenas os 11 dígitos do CPF.');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (fullName.trim()) payload.fullName = fullName.trim();
      if (cpf) payload.cpf = cpf.replace(/\D/g, '');
      if (birthDate) payload.birthDate = formatBirthDate(birthDate);
      if (phone) payload.phone = phone;
      if (acceptedTerms !== profile?.acceptedFinancialTerms) {
        payload.acceptedFinancialTerms = acceptedTerms;
      }

      const updated = await usersService.updateFinancialProfile(payload as any);
      setProfile(updated);
      Alert.alert('Salvo', 'Dados atualizados com sucesso.');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Erro ao salvar.';
      Alert.alert('Erro', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!acceptedTerms) {
      Alert.alert('Atenção', 'Aceite os termos de valor protegido para continuar.');
      return;
    }
    if (!cpf && !profile?.cpfMasked) {
      Alert.alert('Atenção', 'Informe seu CPF antes de enviar.');
      return;
    }
    Alert.alert(
      'Enviar verificação',
      'Seus dados serão enviados para análise. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            setSubmitting(true);
            try {
              const updated = await usersService.submitFinancialProfile();
              setProfile(updated);
              Alert.alert('Enviado!', 'Verificação enviada. Você será notificado quando concluída.');
            } catch (e: any) {
              const msg = e?.response?.data?.message ?? 'Erro ao enviar.';
              Alert.alert('Erro', Array.isArray(msg) ? msg[0] : msg);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  // Dev-only helper
  const handleSimulateApproval = async () => {
    setSaving(true);
    try {
      const updated = await usersService.simulateApproval();
      setProfile(updated);
      Alert.alert('Aprovado', 'Verificação aprovada (simulação de desenvolvimento).');
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.message ?? 'Erro na simulação.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  const canEdit = !profile || ['PENDING', 'REJECTED'].includes(profile.kycStatus);
  const canSubmit = canEdit && profile?.kycStatus !== 'SUBMITTED' && profile?.kycStatus !== 'APPROVED';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Verificação financeira</Text>
      <Text style={styles.subtitle}>
        Para usar valor protegido, precisamos confirmar algumas informações. Seus dados são protegidos e nunca compartilhados.
      </Text>

      {profile && (
        <StatusBanner
          status={profile.kycStatus}
          label={profile.kycStatusLabel}
          message={profile.humanMessage}
        />
      )}

      {profile?.kycRejectionReason && (
        <View style={styles.rejectionBox}>
          <Text style={styles.rejectionTitle}>Motivo da recusa:</Text>
          <Text style={styles.rejectionText}>{profile.kycRejectionReason}</Text>
        </View>
      )}

      {canEdit && (
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Dados pessoais</Text>

          <Text style={styles.label}>Nome completo</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Como no documento"
            autoCapitalize="words"
          />

          <Text style={styles.label}>CPF {profile?.cpfMasked ? `(atual: ${profile.cpfMasked})` : ''}</Text>
          <TextInput
            style={styles.input}
            value={cpf}
            onChangeText={setCpf}
            placeholder="Somente números (11 dígitos)"
            keyboardType="numeric"
            maxLength={14}
          />

          <Text style={styles.label}>Data de nascimento</Text>
          <TextInput
            style={styles.input}
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder="DD/MM/AAAA"
            keyboardType="numeric"
            maxLength={10}
          />

          <Text style={styles.label}>Telefone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+5511999999999"
            keyboardType="phone-pad"
          />

          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAcceptedTerms((v) => !v)}
          >
            <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
              {acceptedTerms && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.termsText}>
              Aceito as regras de valor protegido e autorizo o Selo a usar esses dados para verificação financeira.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Salvar dados</Text>}
          </TouchableOpacity>
        </View>
      )}

      {canSubmit && (
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitBtnText}>Enviar para verificação</Text>}
        </TouchableOpacity>
      )}

      {profile?.kycStatus === 'APPROVED' && (
        <View style={styles.approvedBox}>
          <Text style={styles.approvedText}>✓ Verificado para valor protegido</Text>
        </View>
      )}

      {/* Botão de simulação — apenas desenvolvimento */}
      {(profile?.kycStatus === 'PENDING' || profile?.kycStatus === 'SUBMITTED' || profile?.kycStatus === 'UNDER_REVIEW' || profile?.kycStatus === 'REJECTED') && (
        <View style={styles.devSection}>
          <Text style={styles.devLabel}>Apenas para desenvolvimento</Text>
          <TouchableOpacity style={styles.devBtn} onPress={handleSimulateApproval} disabled={saving}>
            <Text style={styles.devBtnText}>Simular aprovação</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>Voltar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function formatBirthDate(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 8) {
    const d = digits.slice(0, 2);
    const m = digits.slice(2, 4);
    const y = digits.slice(4, 8);
    return `${y}-${m}-${d}`;
  }
  return raw;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 20, lineHeight: 20 },
  statusBanner: {
    backgroundColor: '#fff', borderLeftWidth: 4, borderRadius: 8,
    padding: 14, marginBottom: 16, elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  statusLabel: { fontWeight: '700', fontSize: 14, marginBottom: 4 },
  statusMessage: { fontSize: 13, color: '#475569', lineHeight: 18 },
  rejectionBox: {
    backgroundColor: '#fef2f2', borderRadius: 8, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#fecaca',
  },
  rejectionTitle: { fontWeight: '700', color: '#dc2626', marginBottom: 4 },
  rejectionText: { color: '#7f1d1d', fontSize: 13 },
  form: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  label: { fontSize: 13, color: '#64748b', marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 8, padding: 12, fontSize: 15, color: '#1e293b',
  },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 16, marginBottom: 8 },
  checkbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#7c3aed',
    alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1,
  },
  checkboxChecked: { backgroundColor: '#7c3aed' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  termsText: { flex: 1, fontSize: 13, color: '#475569', lineHeight: 18 },
  saveBtn: {
    backgroundColor: '#7c3aed', borderRadius: 10, padding: 14,
    alignItems: 'center', marginTop: 16,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  submitBtn: {
    backgroundColor: '#16a34a', borderRadius: 10, padding: 14,
    alignItems: 'center', marginBottom: 16,
  },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.6 },
  approvedBox: {
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0', marginBottom: 16,
  },
  approvedText: { color: '#16a34a', fontWeight: '700', fontSize: 15 },
  devSection: {
    backgroundColor: '#fef3c7', borderRadius: 8, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: '#fcd34d',
  },
  devLabel: { fontSize: 11, color: '#92400e', marginBottom: 8, fontWeight: '600' },
  devBtn: {
    backgroundColor: '#d97706', borderRadius: 8, padding: 10, alignItems: 'center',
  },
  devBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  backBtn: { alignItems: 'center', padding: 12 },
  backBtnText: { color: '#7c3aed', fontWeight: '600', fontSize: 15 },
});
