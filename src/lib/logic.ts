import { Violation, ViolationType } from "@/types/database";

export const POINTS_MAP: Record<ViolationType, Record<number, number>> = {
  ringan: { 1: 2, 2: 4, 3: 8, 4: 16 },
  sedang: { 1: 4, 2: 8, 3: 16, 4: 32 },
  berat: { 1: 6, 2: 12, 3: 24, 4: 48 },
  baik: { 1: 0, 2: 0, 3: 0, 4: 0 },
};

export const REDO_OSI_THRESHOLD = 50;
export const REDO_OSPRO_THRESHOLD = REDO_OSI_THRESHOLD;
export const ESCALATION_THRESHOLD = 3;

export function calculatePoints(violations: Violation[]) {
  return violations.reduce((acc, v) => {
    const points = POINTS_MAP[v.violation_type][v.session_number] || 0;
    return acc + points;
  }, 0);
}

export function checkEscalation(violations: Violation[]) {
  // Group by session number
  const sessions: Record<number, number> = {};
  violations.forEach((v) => {
    if (v.violation_type === 'ringan') {
      sessions[v.session_number] = (sessions[v.session_number] || 0) + 1;
    }
  });

  return Object.values(sessions).some((count) => count >= ESCALATION_THRESHOLD);
}

export function getMemberStatus(violations: Violation[]) {
  const points = calculatePoints(violations);
  const hasEscalation = checkEscalation(violations);
  const isRedoOspro = points >= REDO_OSPRO_THRESHOLD;

  const counts = {
    ringan: violations.filter(v => v.violation_type === 'ringan').length,
    sedang: violations.filter(v => v.violation_type === 'sedang').length,
    berat: violations.filter(v => v.violation_type === 'berat').length,
    baik: violations.filter(v => v.violation_type === 'baik').length,
  };

  return {
    points,
    hasEscalation,
    isRedoOspro,
    counts,
  };
}
