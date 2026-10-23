import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowUpRight, Lock, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { getSessionProfile } from '@/lib/auth';
import { SettingsShell } from '@/components/settings/settings-shell';
import type { Role } from '@/types';

const roleLabel: Record<Role, string> = {
  super_admin: 'Super admin',
  school_admin: 'Admin sekolah',
  staff: 'Staf UKS',
};

const roleBadge: Record<Role, string> = {
  super_admin: 'badge badge--plain',
  school_admin: 'badge badge--good',
  staff: 'badge',
};

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function joined(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(value),
  );
}

export default async function SettingsUsersPage() {
  const { profile, supabase } = await getSessionProfile();

  if (!profile) redirect('/auth/signin');
  if (!profile.school_id) redirect('/admin');

  const { data: members } = await supabase
    .from('profiles')
    .select('id,email,full_name,role,created_at')
    .eq('school_id', profile.school_id)
    .order('created_at', { ascending: true });

  const rows = members ?? [];
  const canManage = profile.role === 'school_admin';

  return (
    <SettingsShell
      actions={
        <span className="spill spill--iris">
          <i />
          {rows.length} akun
        </span>
      }
    >
      <div className="set-grid set-grid--single">
        <section className="card set-users">
          <div className="card__head">
            <div className="card__title">
              <UserRound className="ico" />
              <span>
                Pengguna sekolah
                <span className="card__sub">Akun yang dapat mengakses data UKS sekolah ini.</span>
              </span>
            </div>
            <span className="badge badge--plain">{roleLabel[profile.role]}</span>
          </div>

          <div className="set-userlist">
            {rows.map((member) => {
              const label = member.full_name || member.email || 'Tanpa nama';
              const role = member.role as Role;
              return (
                <div key={member.id} className="set-user">
                  <span className="set-user__avatar">{initials(label)}</span>
                  <div className="set-user__main">
                    <div className="set-user__name">
                      <b>{label}</b>
                      {member.id === profile.id && <span className="badge badge--plain">Anda</span>}
                    </div>
                    <span className="set-user__mail">
                      <Mail className="ico" />
                      {member.email ?? '—'}
                    </span>
                  </div>
                  <div className="set-user__meta">
                    <span className={roleBadge[role] ?? 'badge'}>{roleLabel[role] ?? role}</span>
                    <small>Bergabung {joined(member.created_at)}</small>
                  </div>
                </div>
              );
            })}
            {!rows.length && (
              <div className="note">
                <UserRound className="ico" />
                <span>Belum ada akun yang terhubung ke sekolah ini.</span>
              </div>
            )}
          </div>

          <div className="set-note">
            <Lock className="ico" />
            <div>
              <b>Akun dikelola oleh admin Qrion.</b>
              <p>
                Penambahan akun, reset password, dan perubahan peran dilakukan lewat tim dukungan agar hak akses
                tetap terkontrol.
              </p>
              {!canManage && <p>Hanya admin sekolah yang dapat meminta perubahan akun.</p>}
            </div>
            <Link href="/support" className="btn btn--ghost btn--sm">
              Hubungi dukungan
              <ArrowUpRight className="ico" />
            </Link>
          </div>
        </section>

        <section className="card set-roles">
          <div className="card__head">
            <div className="card__title">
              <ShieldCheck className="ico" />
              <span>
                Peran akses
                <span className="card__sub">Ringkasan izin untuk setiap peran.</span>
              </span>
            </div>
          </div>

          <div className="set-role">
            <span className="spill spill--iris">
              <i />
              Admin sekolah
            </span>
            <p>Kelola siswa, kunjungan, inventaris, laporan, dan profil sekolah.</p>
          </div>
          <div className="set-role">
            <span className="spill spill--teal">
              <i />
              Staf UKS
            </span>
            <p>Catat kunjungan dan kelola inventaris; profil sekolah hanya dapat dilihat.</p>
          </div>
          <div className="set-role">
            <span className="spill">
              <i />
              Super admin Qrion
            </span>
            <p>Akses lintas sekolah untuk membuat akun, mengatur status, dan mendukung operasional.</p>
          </div>
        </section>
      </div>
    </SettingsShell>
  );
}
