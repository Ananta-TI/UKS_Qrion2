export type Role = 'super_admin' | 'school_admin' | 'staff';

export type School = {
  id: string;
  name: string;
  slug: string | null;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Student = {
  id: string;
  school_id: string;
  nis: string;
  full_name: string;
  class: string | null;
  blood_type: string | null;
  allergies: string;
  chronic_diseases: string;
  created_at: string;
};

export type Visit = {
  id: string;
  school_id: string;
  student_id: string;
  staff_id: string;
  check_in_at: string;
  check_out_at: string | null;
  chief_complaint: string | null;
  temperature: number | null;
  blood_pressure: string | null;
  weight: number | null;
  height: number | null;
  treatment: string | null;
  final_status: 'back_to_class' | 'referred' | 'picked_up' | null;
  notes: string | null;
  created_at: string;
  students?: Student;
};

export type Medicine = {
  id: string;
  school_id: string;
  name: string;
  category: string | null;
  unit: 'strip' | 'botol' | 'pcs';
  stock: number;
  min_stock: number;
  location: string | null;
  expiry_date: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  school_id: string | null;
  school: string | null;
  created_at: string;
};

export type FinalStatusLabel = {
  back_to_class: 'Kembali ke Kelas';
  referred: 'Dirujuk ke Faskes/RS';
  picked_up: 'Dijemput Orang Tua';
};
