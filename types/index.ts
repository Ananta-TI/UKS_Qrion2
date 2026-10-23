export type Student = {
  id: string;
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
  full_name: string | null;
  role: 'admin' | 'staff';
  school: string | null;
  created_at: string;
};

export type FinalStatusLabel = {
  back_to_class: 'Kembali ke Kelas';
  referred: 'Dirujuk ke Faskes/RS';
  picked_up: 'Dijemput Orang Tua';
};
