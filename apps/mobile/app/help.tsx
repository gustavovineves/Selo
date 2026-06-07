import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, FontWeight, Radii, Shadow } from '../src/theme';

// ── FAQ data ────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    id: 'what-is',
    icon: 'document-text-outline' as const,
    question: 'O que é um combinado?',
    answer:
      'Um combinado é um acordo informal formalizado no Selo. Pode ser qualquer combinação entre duas pessoas: um serviço, uma entrega, um empréstimo, um acordo de pagamento. Tudo fica registrado com prazo e histórico de eventos.',
  },
  {
    id: 'protected-value',
    icon: 'shield-checkmark-outline' as const,
    question: 'O que é valor protegido?',
    answer:
      'Em combinados com garantia, o pagador envia o valor via Pix antes do acordo ser executado. O valor fica protegido na plataforma até que ambas as partes confirmem a conclusão — ou até que uma contestação seja resolvida pelo administrador.\n\nO dinheiro não fica na blockchain. A blockchain registra apenas a prova de que o combinado existiu.',
  },
  {
    id: 'receiving-key',
    icon: 'key-outline' as const,
    question: 'Como funciona a Chave de Recebimento?',
    answer:
      'A Chave de Recebimento é o seu endereço dentro do Selo — um handle no formato @nomeescolhido. Ela serve para que outras pessoas te encontrem e criem combinados com você.\n\nEla é diferente da sua chave Pix. Ninguém usa a Chave de Recebimento para transferir dinheiro diretamente — ela apenas te localiza no app.',
  },
  {
    id: 'key-vs-destination',
    icon: 'swap-horizontal-outline' as const,
    question: 'Qual a diferença entre Chave de Recebimento e destino de recebimento?',
    answer:
      'A Chave de Recebimento (@handle) é o seu endereço no Selo para ser encontrado por outros usuários.\n\nO destino de recebimento é a sua chave Pix real (CPF, e-mail, telefone ou aleatória) para onde o dinheiro é transferido quando um combinado com garantia é concluído.\n\nVocê configura ambos separadamente no seu perfil.',
  },
  {
    id: 'kyc',
    icon: 'person-circle-outline' as const,
    question: 'Quando preciso de verificação financeira?',
    answer:
      'A verificação financeira é necessária quando você quer criar ou receber em combinados com garantia (com valor em dinheiro envolvido).\n\nNão é necessária para combinados simples sem dinheiro.\n\nNo beta, a verificação é simulada — nenhum dado é enviado a órgãos externos.',
  },
  {
    id: 'blockchain',
    icon: 'lock-closed-outline' as const,
    question: 'O dinheiro fica na blockchain?',
    answer:
      'Não. A blockchain no Selo é usada apenas para registrar a prova de que um evento aconteceu — como um carimbo imutável de data e hora.\n\nO dinheiro fica com o parceiro financeiro (Fitbank ou equivalente), não na blockchain. A blockchain complementa o histórico; não guarda fundos.',
  },
  {
    id: 'dispute',
    icon: 'alert-circle-outline' as const,
    question: 'O que acontece se houver contestação?',
    answer:
      'Qualquer participante pode abrir uma contestação formal em um combinado ativo com garantia. Ao contestar, o valor protegido é travado automaticamente.\n\nO administrador do Selo analisa as evidências e decide se libera o valor para o recebedor ou reembolsa o pagador.\n\nNão há chat entre as partes — a resolução é feita por análise administrativa.',
  },
  {
    id: 'sandbox',
    icon: 'flask-outline' as const,
    question: 'O que significa ambiente de teste?',
    answer:
      'O Selo está em beta fechado. Isso significa:\n\n• Nenhum dinheiro real é movimentado.\n• Os pagamentos são simulados — nenhum Pix real acontece.\n• A verificação financeira não consulta órgãos externos.\n• A blockchain registra provas simuladas, sem rede externa.\n\nTudo que você faz no beta é para testar a experiência do produto.',
  },
  {
    id: 'real-money',
    icon: 'cash-outline' as const,
    question: 'O Selo movimenta dinheiro real agora?',
    answer:
      'Não, ainda não. O Selo está em beta fechado e todo o fluxo financeiro é simulado.\n\nQuando o produto for lançado, os pagamentos serão feitos via Pix real e o dinheiro ficará custodiado por um parceiro financeiro regulamentado.',
  },
  {
    id: 'support',
    icon: 'chatbubble-ellipses-outline' as const,
    question: 'Como falar com suporte no beta?',
    answer:
      'Durante o beta, você pode enviar feedback diretamente pelo app (Configurações → Enviar feedback) ou responder o e-mail de convite do beta.\n\nSua opinião é muito importante para melhorarmos o produto antes do lançamento.',
  },
];

// ── Components ──────────────────────────────────────────────────────────────

function FaqItem({
  item,
}: {
  item: (typeof FAQ_ITEMS)[0];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={[styles.faqItem, expanded && styles.faqItemExpanded]}
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.8}
    >
      <View style={styles.faqHeader}>
        <View style={styles.faqIconWrap}>
          <Ionicons name={item.icon} size={18} color={Colors.primary} />
        </View>
        <Text style={styles.faqQuestion} numberOfLines={expanded ? undefined : 2}>
          {item.question}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={Colors.textMuted}
        />
      </View>

      {expanded && (
        <Text style={styles.faqAnswer}>{item.answer}</Text>
      )}
    </TouchableOpacity>
  );
}

// ── Screen ──────────────────────────────────────────────────────────────────

export default function HelpScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Central de Ajuda</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Ionicons name="help-circle" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.introTitle}>Como podemos ajudar?</Text>
          <Text style={styles.introSub}>
            Respostas às perguntas mais comuns sobre o Selo.
          </Text>
        </View>

        {/* Beta notice */}
        <View style={styles.betaBanner}>
          <Ionicons name="flask-outline" size={16} color="#92400E" />
          <Text style={styles.betaText}>
            Você está no <Text style={styles.betaBold}>beta fechado</Text> — ambiente de teste.
            Nenhum dinheiro real é movimentado.
          </Text>
        </View>

        {/* FAQ */}
        <Text style={styles.sectionTitle}>Perguntas frequentes</Text>

        {FAQ_ITEMS.map((item) => (
          <FaqItem key={item.id} item={item} />
        ))}

        {/* Contact */}
        <View style={styles.contactCard}>
          <Ionicons name="mail-outline" size={20} color={Colors.primary} />
          <View style={styles.contactText}>
            <Text style={styles.contactTitle}>Ainda tem dúvidas?</Text>
            <Text style={styles.contactDesc}>
              Responda o e-mail de convite do beta ou envie feedback pelo app.
            </Text>
          </View>
        </View>

        <View style={styles.bottom} />
      </ScrollView>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgBase,
  },
  header: {
    backgroundColor: Colors.bgDark,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  intro: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  introIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  introTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  introSub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  betaBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: Radii.md,
    borderLeftWidth: 3,
    borderLeftColor: '#D97706',
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  betaText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: '#78350F',
    lineHeight: 18,
  },
  betaBold: {
    fontWeight: FontWeight.bold,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  faqItem: {
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  faqItemExpanded: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  faqIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  faqQuestion: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  faqAnswer: {
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 21,
    paddingLeft: 40,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.primaryGlow,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  contactText: { flex: 1 },
  contactTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  contactDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  bottom: {
    height: 40,
  },
});
