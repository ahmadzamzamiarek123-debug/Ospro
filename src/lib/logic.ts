import { Violation, ViolationType } from "@/types/database";

export const POINTS_MAP: Record<ViolationType, Record<number, number>> = {
  ringan: { 1: 2, 2: 7, 3: 12, 4: 17 },
  sedang: { 1: 5, 2: 10, 3: 15, 4: 20 },
  berat: { 1: 10, 2: 20, 3: 30, 4: 40 },
  baik: { 1: 0, 2: 0, 3: 0, 4: 0 },
};

export const REDO_OSPRO_THRESHOLD = 50;
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
