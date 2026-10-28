/**
 * Tipe database Supabase UKS.
 *
 * Ditulis manual agar selaras dengan `database/schema.sql`,
 * `database/migration_multi_tenant.sql`, `database/activity_logs.sql`,
 * dan `database/migrations/*.sql`. Bila skema berubah, perbarui berkas ini
 * (atau ganti dengan hasil `supabase gen types typescript`).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** Peran akun di seluruh aplikasi (satu-satunya sumber). */
export type Role = 'super_admin' | 'school_admin' | 'staff';

export type SchoolRow = {
  id: string;
  name: string;
  slug: string | null;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  school_id: string | null;
  school: string | null;
  created_at: string | null;
};

export type StudentRow = {
  id: string;
  school_id: string;
  nis: string;
  full_name: string;
  class: string | null;
  blood_type: string | null;
  allergies: string | null;
  chronic_diseases: string | null;
  created_at: string | null;
};

export type FinalStatus = 'back_to_class' | 'referred' | 'picked_up';

export type VisitRow = {
  id: string;
  school_id: string;
  student_id: string;
  staff_id: string;
  check_in_at: string | null;
  check_out_at: string | null;
  chief_complaint: string | null;
  temperature: number | null;
  blood_pressure: string | null;
  weight: number | null;
  height: number | null;
  treatment: string | null;
  final_status: FinalStatus | null;
  notes: string | null;
  created_at: string | null;
};

export type MedicineUnit = 'strip' | 'botol' | 'pcs';

export type MedicineRow = {
  id: string;
  school_id: string;
  name: string;
  category: string | null;
  unit: MedicineUnit | null;
  stock: number | null;
  min_stock: number | null;
  location: string | null;
  expiry_date: string | null;
  created_at: string | null;
};

export type MedicineLogRow = {
  id: string;
  school_id: string;
  medicine_id: string;
  type: 'in' | 'out';
  qty: number;
  reference_id: string | null;
  notes: string | null;
  created_at: string | null;
};

export type MedicineBatchRow = {
  id: string;
  school_id: string;
  medicine_id: string;
  qty: number;
  expiry_date: string | null;
  batch_no: string | null;
  received_at: string;
  notes: string | null;
  created_at: string;
};

export type ActivityLogRow = {
  id: string;
  school_id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  summary: string;
  metadata: Json;
  created_at: string;
};

export type SavedReportRow = {
  id: string;
  school_id: string;
  created_by: string | null;
  created_by_name: string | null;
  name: string;
  metric: string;
  group_by: string;
  chart: string;
  range_key: string;
  created_at: string;
  updated_at: string;
};

type TableDef<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      schools: TableDef<
        SchoolRow,
        Partial<SchoolRow> & { name: string },
        Partial<SchoolRow>
      >;
      profiles: TableDef<
        ProfileRow,
        Partial<ProfileRow> & { id: string },
        Partial<ProfileRow>
      >;
      students: TableDef<
        StudentRow,
        Partial<StudentRow> & { nis: string; full_name: string },
        Partial<StudentRow>
      >;
      visits: TableDef<
        VisitRow,
        Partial<VisitRow> & { student_id: string; staff_id: string },
        Partial<VisitRow>
      >;
      medicines: TableDef<
        MedicineRow,
        Partial<MedicineRow> & { name: string },
        Partial<MedicineRow>
      >;
      medicine_logs: TableDef<
        MedicineLogRow,
        Partial<MedicineLogRow> & { medicine_id: string; type: 'in' | 'out'; qty: number },
        Partial<MedicineLogRow>
      >;
      medicine_batches: TableDef<
        MedicineBatchRow,
        Partial<MedicineBatchRow> & { medicine_id: string },
        Partial<MedicineBatchRow>
      >;
      activity_logs: TableDef<
        ActivityLogRow,
        Partial<ActivityLogRow> & { action: string; entity: string; summary: string },
        Partial<ActivityLogRow>
      >;
      saved_reports: TableDef<
        SavedReportRow,
        Partial<SavedReportRow> & { name: string },
        Partial<SavedReportRow>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      current_school_id: { Args: Record<string, never>; Returns: string };
      is_super_admin: { Args: Record<string, never>; Returns: boolean };
      dispense_medicines: {
        Args: { p_visit_id: string; p_items: Json; p_note?: string | null };
        Returns: Json;
      };
      apply_stock_opname: {
        Args: { p_medicine: string; p_counted: number; p_note?: string | null };
        Returns: Json;
      };
      restock_medicine: {
        Args: { p_medicine: string; p_qty: number; p_note?: string | null };
        Returns: Json;
      };
      seed_default_medicines: { Args: { p_school: string }; Returns: number };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/** Bentuk hasil RPC `dispense_medicines`. */
export type DispenseItem = { id: string; name: string; qty: number; requested?: number };
export type DispenseSkipped = {
  id: string;
  name: string;
  reason: 'not_found' | 'forbidden' | 'empty' | 'insufficient';
  requested?: number;
  given?: number;
};
export type DispenseResult = {
  dispensed: DispenseItem[];
  skipped: DispenseSkipped[];
};

export type StockOpnameResult = {
  ok: boolean;
  before?: number;
  after?: number;
  diff?: number;
  error?: string;
};

/** Bentuk hasil RPC `restock_medicine`. */
export type RestockResult = {
  ok: boolean;
  before?: number;
  after?: number;
  added?: number;
  error?: string;
};
