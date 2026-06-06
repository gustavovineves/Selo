import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radii, FontSize, FontWeight, Shadow } from '../theme';
import { TimeWheelPicker } from './TimeWheelPicker';

const QUICK_DATES: { label: string; sub: string; days: number }[] = [
  { label: 'Hoje', sub: 'fim do dia', days: 0 },
  { label: 'Amanhã', sub: '+1 dia', days: 1 },
  { label: '7 dias', sub: '+1 semana', days: 7 },
  { label: '30 dias', sub: '+1 mês', days: 30 },
];

function addDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function formatShortDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatFullDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function parseDateInput(input: string): Date | null {
  const trimmed = input.trim();
  if (trimmed.length !== 10) return null;
  const parts = trimmed.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map((p) => parseInt(p, 10));
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  if (y < 2024 || y > 2035 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return null;
  return date;
}

interface Props {
  selectedDate: Date | null;
  selectedHour: number;
  selectedMinute: number;
  onDateChange: (date: Date | null) => void;
  onTimeChange: (hour: number, minute: number) => void;
}

export function DueDatePicker({
  selectedDate,
  selectedHour,
  selectedMinute,
  onDateChange,
  onTimeChange,
}: Props) {
  const [showCustom, setShowCustom] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  function handleQuickDate(days: number) {
    setShowCustom(false);
    setInputError(null);
    setCustomInput('');
    onDateChange(addDays(days));
  }

  function handleCustomInputChange(text: string) {
    setCustomInput(text);
    if (text.length === 10) {
      const parsed = parseDateInput(text);
      if (parsed) {
        setInputError(null);
        onDateChange(parsed);
      } else {
        setInputError('Data inválida. Use o formato DD/MM/AAAA.');
        onDateChange(null);
      }
    } else {
      setInputError(null);
      onDateChange(null);
    }
  }

  function toggleCustom() {
    const next = !showCustom;
    setShowCustom(next);
    if (next) {
      setCustomInput('');
      setInputError(null);
      onDateChange(null);
    }
  }

  function isQuickActive(days: number): boolean {
    if (!selectedDate || showCustom) return false;
    return sameDay(selectedDate, addDays(days));
  }

  const timeLabel = `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;

  return (
    <View>
      {/* ── Data ─────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Dia do prazo *</Text>
      <Text style={styles.sectionHint}>Até quando esse combinado deve ser cumprido?</Text>

      <View style={styles.quickGrid}>
        {QUICK_DATES.map((q) => {
          const active = isQuickActive(q.days);
          return (
            <TouchableOpacity
              key={q.days}
              style={[styles.quickChip, active && styles.quickChipActive]}
              onPress={() => handleQuickDate(q.days)}
              activeOpacity={0.75}
            >
              <Text style={[styles.quickChipLabel, active && styles.quickChipLabelActive]}>
                {q.label}
              </Text>
              <Text style={[styles.quickChipSub, active && styles.quickChipSubActive]}>
                {formatShortDate(addDays(q.days))}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Outra data */}
      <TouchableOpacity
        style={[styles.customToggle, showCustom && styles.customToggleActive]}
        onPress={toggleCustom}
        activeOpacity={0.75}
      >
        <Ionicons
          name={showCustom ? 'calendar' : 'calendar-outline'}
          size={16}
          color={showCustom ? Colors.primary : Colors.textSecondary}
        />
        <Text style={[styles.customToggleText, showCustom && styles.customToggleTextActive]}>
          {showCustom ? 'Cancelar data personalizada' : 'Outra data'}
        </Text>
      </TouchableOpacity>

      {showCustom && (
        <View style={styles.customInputWrap}>
          <TextInput
            style={[styles.customInput, inputError ? styles.customInputError : undefined]}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={Colors.textMuted}
            value={customInput}
            onChangeText={handleCustomInputChange}
            keyboardType="numeric"
            maxLength={10}
            autoFocus
          />
          {inputError ? (
            <Text style={styles.customInputErrorText}>{inputError}</Text>
          ) : null}
        </View>
      )}

      {/* Selected date preview */}
      {selectedDate ? (
        <View style={styles.datePreview}>
          <Ionicons name="calendar" size={16} color={Colors.primary} />
          <Text style={styles.datePreviewText}>{formatFullDate(selectedDate)}</Text>
        </View>
      ) : null}

      {/* ── Separador ────────────────────────────────── */}
      <View style={styles.divider} />

      {/* ── Horário ──────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Horário limite *</Text>
      <Text style={styles.sectionHint}>
        Escolha o horário em que o prazo encerra. Role e selecione.
      </Text>

      <TimeWheelPicker
        hour={selectedHour}
        minute={selectedMinute}
        onSelect={onTimeChange}
      />

      {/* ── Preview final ────────────────────────────── */}
      {selectedDate ? (
        <View style={styles.finalPreview}>
          <Ionicons name="time-outline" size={18} color={Colors.primary} />
          <Text style={styles.finalPreviewText}>
            Prazo: <Text style={styles.finalPreviewBold}>{formatFullDate(selectedDate)} às {timeLabel}</Text>
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  sectionHint: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  quickChip: {
    flex: 1,
    borderRadius: Radii.md,
    backgroundColor: Colors.bgCard,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    ...Shadow.sm,
  },
  quickChipActive: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primary,
  },
  quickChipLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  quickChipLabelActive: {
    color: Colors.primary,
  },
  quickChipSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  quickChipSubActive: {
    color: Colors.primaryLight,
  },
  customToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: Colors.bgCard,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  customToggleActive: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primary,
  },
  customToggleText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  customToggleTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  customInputWrap: {
    marginBottom: Spacing.sm,
  },
  customInput: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    ...Shadow.sm,
  },
  customInputError: {
    borderColor: Colors.danger,
  },
  customInputErrorText: {
    fontSize: FontSize.xs,
    color: Colors.danger,
    marginTop: 4,
  },
  datePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryGlow,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  datePreviewText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.md,
  },
  finalPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    backgroundColor: Colors.primaryGlow,
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  finalPreviewText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  finalPreviewBold: {
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
});
