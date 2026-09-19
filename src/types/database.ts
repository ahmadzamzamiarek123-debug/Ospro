export type UserRole = 'admin' | 'viewer';
export type MemberRole = 'panitia' | 'peserta';
export type ViolationType = 'ringan' | 'sedang' | 'berat' | 'baik';
export type SessionNumber = 1 | 2 | 3 | 4;

export interface User {
  id: string;
  nim?: string;
  email?: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface Member {
  id: string;
  nim: string;
  name: string;
  role: MemberRole;
  kelompok?: string;
  pendamping?: string;
  no_wa_pendamping?: string;
  ticket_claimed_at?: string;
  created_at: string;
}

export interface Session {
  id: string;
  session_number: SessionNumber;
  date: string;
  is_active: boolean;
}

export interface Violation {
  id: string;
  member_id: string;
  violation_type: ViolationType;
  session_number: number;
  violation_category: string;
  consequence?: string | null;
  status?: 'pending' | 'selesai';
  chronology?: string | null;
  notes?: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface ViolationWithMember extends Violation {
  member: {
    name: string;
    nim: string;
    kelompok?: string;
  };
}

export interface ViolationWithDetails extends Violation {
  recorded_by_user?: {
    name: string;
  };
  member?: {
    name: string;
    nim: string;
    kelompok?: string;
  };
  recorder?: {
    name: string;
  };
}

export interface MemberWithPoints extends Member {
  points: number;
  violations_count: {
    ringan: number;
    sedang: number;
    berat: number;
    baik: number;
  };
  has_escalation: boolean;
  is_redo_ospro: boolean;
  is_redo_osi?: boolean;
}

export type AttendanceStatus = 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'alpha';
export type AttendanceMethod = 'qr_scan' | 'manual_operator';

export interface AttendanceRecord {
  id: string;
  member_id: string;
  session_number: number;
  status: AttendanceStatus;
  method: AttendanceMethod;
  scanned_at: string;
  notes?: string | null;
}

export interface AttendanceWithMember extends AttendanceRecord {
  member: {
    id: string;
    nim: string;
    name: string;
    kelompok?: string;
  };
}
