import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight, Radii } from '../../src/theme';

const SLIDES = [
  {
    icon: 'document-text-outline' as const,
    color: Colors.primary,
    title: 'Combinados simples',
    desc: 'Registre qualquer acordo com uma pessoa: um trabalho, um empréstimo, uma promessa. Tudo com prazo, histórico e prova formal — sem burocracia.',
    example: 'Ex: "Carlos vai pagar o aluguel até dia 10."',
  },
  {
    icon: 'lock-closed-outline' as const,
    color: Colors.accent,
    title: 'Valor protegido',
    desc: 'Para combinados com dinheiro, o valor fica guardado na plataforma. O recebedor só recebe quando ambas as partes confirmam que o combinado foi cumprido.',
    example: 'Ex: "Maria vai entregar o logo. O pagamento de R$ 350 está protegido."',
  },
  {
    icon: 'alert-circle-outline' as const,
    color: Colors.warning,
    title: 'Contestação formal',
    desc: 'Se algo der errado, você pode contestar formalmente. O valor fica travado e um administrador analisa as evidências para decidir.',
    example: 'Sem chat. Sem briga. Formal e registrado.',
  },
  {
    icon: 'star-outline' as const,
    color: '#F59E0B',
    title: 'Score de confiança',
    desc: 'Cada combinado cumprido melhora seu histórico. Seu score é público e ajuda outras pessoas a confiarem em você.',
    example: '"Em formação" → "Histórico positivo" → "Referência"',
  },
];

export default function TutorialScreen() {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  function next() {
    if (isLast) {
      router.replace('/(app)/home');
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.step}>3 de 3</Text>
        <TouchableOpacity onPress={() => router.replace('/(app)/home')}>
          <Text style={styles.skipLink}>Pular tudo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === step && styles.dotActive]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.iconWrap, { backgroundColor: slide.color + '1A' }]}>
          <Ionicons name={slide.icon} size={44} color={slide.color} />
        </View>

        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.desc}>{slide.desc}</Text>

        <View style={styles.exampleBox}>
          <Text style={styles.exampleText}>{slide.example}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep((s) => s - 1)}>
            <Ionicons name="arrow-back" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.nextBtn, step === 0 && styles.nextBtnFull]}
          onPress={next}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>
            {isLast ? 'Começar agora' : 'Próximo'}
          </Text>
          <Ionicons
            name={isLast ? 'checkmark' : 'arrow-forward'}
            size={18}
            color={Colors.white}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgBase, paddingHorizontal: Spacing.lg },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  step: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: FontWeight.medium },
  skipLink: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },
  dots: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.primary,
  },
  content: {
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  desc: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  exampleBox: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    alignSelf: 'stretch',
  },
  exampleText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  backBtn: {
    width: 48,
    height: 52,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: Radii.xl,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  nextBtnFull: { flex: 1 },
  nextBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
});
