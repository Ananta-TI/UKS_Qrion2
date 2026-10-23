import { AppShell } from '@/components/layout/app-shell';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  Users,
  ClipboardList,
  AlertTriangle,
  Clock,
  Plus,
  Search,
  Package,
  Stethoscope,
  ChevronRight,
} from 'lucide-react';

const statusMap: Record<string, { label: string; cls: string }> = {
  back_to_class: { label: 'Kelas', cls: 'badge badge--good' },
  referred: { label: 'Rujukan', cls: 'badge badge--bad' },
  picked_up: { label: 'Orang Tua', cls: 'badge badge--warn' },
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const [students, visits, medicines] = await Promise.all([
    supabase.from('students').select('count', { head: true }),
    supabase.from('visits').select('*, students(*)').gte('check_in_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    supabase.from('medicines').select('*'),
  ]);

  const totalStudents = students.count ?? 0;
  const todayVisits = visits.data?.length ?? 0;
  const lowStock = medicines.data?.filter((m) => (m.stock ?? 0) <= (m.min_stock ?? 5)).length ?? 0;
  const expiringSoon = medicines.data?.filter((m) => {
    if (!m.expiry_date) return false;
    const diff = new Date(m.expiry_date).getTime() - new Date().getTime();
    return diff > 0 && diff <= 30 * 24 * 60 * 60 * 1000;
  }).length ?? 0;

  const recentVisits = (visits.data ?? []).slice(0, 6);
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <AppShell
      title="Dashboard"
      crumbs={[{ label: 'UKS', href: '/' }, { label: 'Dashboard' }]}
      actions={
        <div className="shift">
          <span className="shift__clock"><i />Hari ini</span>
          <span className="shift__txt">
            <b>{today}</b>
            <small>Ringkasan aktivitas UKS</small>
          </span>
        </div>
      }
    >
      <section className="kpis" aria-label="Ringkasan">
        <div className="stat stat--dark">
          <div className="stat__label"><span className="stat__ico"><Users className="ico" /></span>Total Siswa</div>
          <div className="stat__value">{totalStudents}</div>
        </div>
        <div className="stat stat--accent">
          <div className="stat__label"><span className="stat__ico"><ClipboardList className="ico" /></span>Kunjungan Hari Ini</div>
          <div className="stat__value">{todayVisits}<span className="stat__suffix">kunjungan</span></div>
        </div>
        <div className="stat">
          <div className="stat__label"><span className="stat__ico"><AlertTriangle className="ico" /></span>Stok Menipis</div>
          <div className="stat__value">{lowStock}{lowStock > 0 && <span className="badge badge--bad">Perlu restock</span>}</div>
        </div>
        <div className="stat">
          <div className="stat__label"><span className="stat__ico"><Clock className="ico" /></span>Kedaluwarsa</div>
          <div className="stat__value">{expiringSoon}{expiringSoon > 0 && <span className="badge badge--warn">≤ 30 hari</span>}</div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="card" style={{ height: '100%' }}>
            <div className="card__head">
              <h2 className="card__title"><ClipboardList className="ico" />Kunjungan Terkini</h2>
              <a className="card__link" href="/visits">Lihat semua</a>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Siswa</th>
                    <th>Kelas</th>
                    <th>Keluhan</th>
                    <th className="r">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentVisits.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty">
                          <ClipboardList className="ico" />
                          <div className="empty__title">Belum ada kunjungan hari ini</div>
                          <div className="empty__text">Kunjungan yang dicatat akan muncul di sini.</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    recentVisits.map((v: any) => {
                      const st = statusMap[v.final_status] ?? { label: '-', cls: 'badge badge--plain' };
                      return (
                        <tr key={v.id}>
                          <td className="muted">{new Date(v.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td>
                            <div className="cell-person">
                              <span className="av av--sm av--sky">{(v.students?.full_name ?? '?').charAt(0)}</span>
                              <div><b>{v.students?.full_name ?? '-'}</b><small>{v.students?.nis}</small></div>
                            </div>
                          </td>
                          <td className="muted">{v.students?.class ?? '-'}</td>
                          <td className="muted">{v.chief_complaint ?? '-'}</td>
                          <td className="r"><span className={st.cls}>{st.label}</span></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid gap-4 content-start">
          <div className="card">
            <div className="card__head">
              <h2 className="card__title"><Plus className="ico" />Aksi Cepat</h2>
            </div>
            <div className="rows">
              <a className="row" href="/visits/new">
                <span className="av av--md av--coral"><Stethoscope className="ico" /></span>
                <div className="grow"><b>Catat Kunjungan</b><small>Rekam medis harian</small></div>
                <ChevronRight className="ico muted" />
              </a>
              <a className="row" href="/students">
                <span className="av av--md av--teal"><Search className="ico" /></span>
                <div className="grow"><b>Cari Data Siswa</b><small>Nama / NIS</small></div>
                <ChevronRight className="ico muted" />
              </a>
              <a className="row" href="/inventory">
                <span className="av av--md av--amber"><Package className="ico" /></span>
                <div className="grow"><b>Kelola Inventaris</b><small>Stok & kedaluwarsa</small></div>
                <ChevronRight className="ico muted" />
              </a>
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <h2 className="card__title"><AlertTriangle className="ico" />Peringatan Stok</h2>
            </div>
            {lowStock > 0 ? (
              <div className="note note--bad">
                <AlertTriangle className="ico" />
                <div>Ada <b>{lowStock} obat</b> dengan stok menipis. Segera lakukan restock.</div>
              </div>
            ) : (
              <div className="note">
                <Package className="ico" />
                <div>Semua stok obat dalam kondisi aman.</div>
              </div>
            )}
            {expiringSoon > 0 && (
              <div className="note note--warn" style={{ marginTop: 10 }}>
                <Clock className="ico" />
                <div><b>{expiringSoon} obat</b> akan kedaluwarsa dalam 30 hari.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
