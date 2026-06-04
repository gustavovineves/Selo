export const TRUST_SCORE = {
  MIN: 0,
  MAX: 1000,
  DEFAULT: 500,
  THRESHOLDS: {
    VERY_LOW: 200,
    LOW: 400,
    MEDIUM: 600,
    HIGH: 800,
    VERY_HIGH: 1000,
  },
} as const;

export const TRUST_SCORE_LABELS = {
  VERY_LOW: 'Muito Baixo',
  LOW: 'Baixo',
  MEDIUM: 'Médio',
  HIGH: 'Alto',
  VERY_HIGH: 'Muito Alto',
} as const;

export function getTrustScoreLabel(score: number): string {
  if (score < TRUST_SCORE.THRESHOLDS.VERY_LOW) return TRUST_SCORE_LABELS.VERY_LOW;
  if (score < TRUST_SCORE.THRESHOLDS.LOW) return TRUST_SCORE_LABELS.LOW;
  if (score < TRUST_SCORE.THRESHOLDS.MEDIUM) return TRUST_SCORE_LABELS.MEDIUM;
  if (score < TRUST_SCORE.THRESHOLDS.HIGH) return TRUST_SCORE_LABELS.HIGH;
  return TRUST_SCORE_LABELS.VERY_HIGH;
}
