-- Seed data contoh (opsional)
insert into students (nis, full_name, class, blood_type, allergies, chronic_diseases) values
  ('2024001', 'Ahmad Fauzi', '7A', 'O', 'Udang, debu', 'Asma'),
  ('2024002', 'Siti Nurhaliza', '8B', 'A', 'Penisilin', '-'),
  ('2024003', 'Budi Santoso', '9C', 'B', '-', 'Epilepsi'),
  ('2024004', 'Dewi Lestari', '7A', 'AB', 'Kacang tanah', '-'),
  ('2024005', 'Rizky Ramadhan', '8A', 'O', '-', '-')
on conflict (nis) do nothing;

insert into medicines (name, category, unit, stock, min_stock, location, expiry_date) values
  ('Paracetamol 500mg', 'Analgesik/Antipiretik', 'strip', 20, 5, 'Rak A1', '2027-06-30'),
  ('Amoxicillin 500mg', 'Antibiotik', 'strip', 8, 5, 'Rak A2', '2026-12-31'),
  ('OBH Combi', 'Batuk', 'botol', 3, 5, 'Rak B1', '2026-11-15'),
  ('Betadine', 'Antiseptik', 'botol', 6, 2, 'Rak B2', '2027-01-20'),
  ('Plester Hansaplast', 'Pertolongan Luka', 'pcs', 50, 10, 'Rak C1', '2028-01-01'),
  ('Antasida', 'Gangguan Lambung', 'strip', 4, 5, 'Rak A3', '2026-10-30')
on conflict do nothing;
